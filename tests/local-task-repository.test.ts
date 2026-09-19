import { describe, expect, it, vi } from "vitest";

import {
  LocalTaskRepository,
  TASK_STORAGE_KEY,
} from "@/data/local-task-repository";
import type { Task } from "@/types/task";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new DOMException("Storage is unavailable", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

const NOW = new Date("2026-09-03T08:30:00.000Z");

function createRepository(storage: Storage): LocalTaskRepository {
  return new LocalTaskRepository({
    storage,
    now: () => NOW,
  });
}

function createStoredTask(): Task {
  return {
    id: "legacy-task",
    title: "Migrated task",
    description: "",
    category: "Personal",
    dueDate: "2026-09-05",
    dueTime: null,
    completed: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}

describe("LocalTaskRepository", () => {
  it("starts guest mode empty without creating sample tasks", async () => {
    const storage = new MemoryStorage();

    expect(await createRepository(storage).getTasks()).toEqual([]);
    expect(JSON.parse(storage.getItem(TASK_STORAGE_KEY) ?? "{}").tasks).toEqual([]);
  });

  it("removes legacy samples while preserving real guest tasks", async () => {
    const storage = new MemoryStorage();
    const realTask = createStoredTask();
    storage.setItem(
      TASK_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: NOW.toISOString(),
        tasks: [
          { ...realTask, id: "sample-cs361-readme", title: "Old demo" },
          realTask,
        ],
      }),
    );

    const repository = createRepository(storage);
    expect(await repository.getTasks()).toEqual([realTask]);
    expect(await repository.getMigrationTasks()).toEqual([realTask]);
    expect(JSON.parse(storage.getItem(TASK_STORAGE_KEY) ?? "{}").tasks).toEqual([
      realTask,
    ]);
  });

  it("creates, updates, serializes, reloads, and deletes tasks", async () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);

    const created = await repository.createTask({
      title: "  Prepare presentation  ",
      description: "  Add architecture slide  ",
      category: "  CS361  ",
      dueDate: "2026-09-04",
      dueTime: "13:30",
    });

    expect(created).toMatchObject({
      title: "Prepare presentation",
      description: "Add architecture slide",
      category: "CS361",
      completed: false,
    });

    const serialized = storage.getItem(TASK_STORAGE_KEY);
    expect(serialized).not.toBeNull();
    expect(JSON.parse(serialized ?? "{}")).toMatchObject({
      version: 1,
      savedAt: NOW.toISOString(),
    });

    const updated = await repository.updateTask(created.id, {
      completed: true,
      dueTime: null,
      title: "Presentation ready",
    });
    expect(updated).toMatchObject({
      completed: true,
      dueTime: null,
      title: "Presentation ready",
    });

    const reloadedRepository = createRepository(storage);
    expect(await reloadedRepository.getTask(created.id)).toEqual(updated);

    await reloadedRepository.deleteTask(created.id);
    expect(await reloadedRepository.getTasks()).toEqual([]);
  });

  it("notifies subscribers after each mutation", async () => {
    const repository = createRepository(new MemoryStorage());
    const listener = vi.fn();
    const unsubscribe = repository.subscribe(listener);

    const task = await repository.createTask({
      title: "Submit assignment",
      category: "CS263",
      dueDate: "2026-09-03",
    });
    await repository.updateTask(task.id, { completed: true });
    await repository.deleteTask(task.id);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls.map(([snapshot]) => snapshot.length)).toEqual([
      1, 1, 0,
    ]);
    unsubscribe();
  });

  it("migrates the previous V1 key without losing task data", async () => {
    const storage = new MemoryStorage();
    const legacyKey = "taskflow.tasks.v1";
    const task = createStoredTask();

    storage.setItem(
      legacyKey,
      JSON.stringify({
        version: 1,
        savedAt: NOW.toISOString(),
        tasks: [task],
      }),
    );

    const repository = createRepository(storage);
    expect(await repository.getTasks()).toEqual([task]);
    expect(storage.getItem(TASK_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(legacyKey)).toBeNull();
  });

  it("loads legacy records containing priority without exposing that field", async () => {
    const storage = new MemoryStorage();
    const task = createStoredTask();
    storage.setItem(
      TASK_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: NOW.toISOString(),
        tasks: [{ ...task, priority: "high" }],
      }),
    );

    const [loaded] = await createRepository(storage).getTasks();
    expect(loaded).toEqual(task);
    expect(loaded).not.toHaveProperty("priority");
  });

  it("retains the legacy key when the migrated value cannot be persisted", async () => {
    const storage = new MemoryStorage();
    const legacyKey = "taskflow.tasks.v1";
    const task = createStoredTask();
    storage.setItem(
      legacyKey,
      JSON.stringify({ version: 1, savedAt: NOW.toISOString(), tasks: [task] }),
    );
    storage.failWrites = true;

    expect(await createRepository(storage).getTasks()).toEqual([task]);
    expect(storage.getItem(TASK_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(legacyKey)).not.toBeNull();
  });

  it("clears migration tasks only when the empty state is persisted", async () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    await repository.createTask({
      title: "Move me",
      category: "Personal",
      dueDate: "2026-09-04",
    });

    await repository.clearMigrationTasks();

    expect(await repository.getMigrationTasks()).toEqual([]);
    expect(await repository.getTasks()).toEqual([]);
  });

  it("preserves migration tasks when clearing browser storage fails", async () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    const created = await repository.createTask({
      title: "Keep me safe",
      category: "Personal",
      dueDate: "2026-09-04",
    });
    storage.failWrites = true;

    await expect(repository.clearMigrationTasks()).rejects.toMatchObject({
      code: "storage_unavailable",
    });
    expect(await repository.getMigrationTasks()).toEqual([created]);
  });
});
