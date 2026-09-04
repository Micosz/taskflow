import { describe, expect, it, vi } from "vitest";

import {
  createTaskMigrationFingerprint,
  isTaskMigrationDismissed,
  migrateLocalTasksToCloud,
  persistTaskMigrationDismissal,
  type CloudTaskMigrationTarget,
  type LocalTaskMigrationSource,
} from "@/data/task-migration";
import type { Task } from "@/types/task";

function task(id: string): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "Notes",
    category: "CS263",
    dueDate: "2026-09-04",
    dueTime: "10:30",
    completed: id === "two",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: `2026-09-0${id === "one" ? "2" : "3"}T00:00:00.000Z`,
  };
}

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("local-to-cloud task migration", () => {
  it("imports every task before clearing the local source", async () => {
    const events: string[] = [];
    const tasks = [task("one"), task("two")];
    const source: LocalTaskMigrationSource = {
      getMigrationTasks: vi.fn(async () => tasks),
      clearMigrationTasks: vi.fn(async () => { events.push("clear"); }),
    };
    const target: CloudTaskMigrationTarget = {
      importTasks: vi.fn(async (input) => {
        events.push("import");
        return [...input];
      }),
    };

    await expect(migrateLocalTasksToCloud(source, target)).resolves.toEqual({
      importedTasks: tasks,
      migratedCount: 2,
    });
    expect(events).toEqual(["import", "clear"]);
  });

  it("preserves local tasks when the cloud import fails", async () => {
    const clearMigrationTasks = vi.fn(async () => undefined);
    const source: LocalTaskMigrationSource = {
      getMigrationTasks: async () => [task("one")],
      clearMigrationTasks,
    };
    const target: CloudTaskMigrationTarget = {
      importTasks: async () => { throw new Error("network unavailable"); },
    };

    await expect(migrateLocalTasksToCloud(source, target)).rejects.toThrow();
    expect(clearMigrationTasks).not.toHaveBeenCalled();
  });

  it("is duplicate-safe when clearing fails and the user retries", async () => {
    const localTasks = [task("one"), task("two")];
    let clearAttempts = 0;
    const cloud = new Map<string, Task>();
    const source: LocalTaskMigrationSource = {
      getMigrationTasks: async () => localTasks,
      clearMigrationTasks: async () => {
        clearAttempts += 1;
        if (clearAttempts === 1) throw new Error("storage blocked");
      },
    };
    const target: CloudTaskMigrationTarget = {
      importTasks: async (tasks) => {
        tasks.forEach((item) => cloud.set(item.id, item));
        return [...cloud.values()];
      },
    };

    await expect(migrateLocalTasksToCloud(source, target)).rejects.toThrow();
    await expect(migrateLocalTasksToCloud(source, target)).resolves.toMatchObject({
      migratedCount: 2,
    });
    expect(cloud.size).toBe(2);
  });

  it("stores a dismissal only for the same user and task fingerprint", () => {
    const storage = new MemoryStorage();
    const fingerprint = createTaskMigrationFingerprint([task("one")]);
    persistTaskMigrationDismissal("user-a", fingerprint, storage);

    expect(isTaskMigrationDismissed("user-a", fingerprint, storage)).toBe(true);
    expect(isTaskMigrationDismissed("user-b", fingerprint, storage)).toBe(false);
    expect(
      isTaskMigrationDismissed(
        "user-a",
        createTaskMigrationFingerprint([task("one"), task("two")]),
        storage,
      ),
    ).toBe(false);
  });
});
