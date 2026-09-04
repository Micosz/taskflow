import { describe, expect, it, vi } from "vitest";
import {
  migrateLocalWorkspaceToCloud,
  type CloudWorkspaceMigrationTarget,
  type LocalWorkspaceMigrationSource,
} from "@/data/workspace-migration";
import { getCourseDedupeKey, type Course } from "@/types/course";
import type { Task } from "@/types/task";

const task: Task = {
  id: "task-1",
  title: "Submit assignment",
  description: "",
  category: "CS263",
  dueDate: "2026-09-04",
  dueTime: null,
  completed: false,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
};
const course: Course = {
  id: "course-1",
  code: "CS263",
  name: "Software Requirements",
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
};

function createSource(): LocalWorkspaceMigrationSource {
  return {
    getMigrationTasks: vi.fn(async () => [task]),
    getMigrationCourses: vi.fn(async () => [course]),
    clearMigrationTasks: vi.fn(async () => undefined),
    clearMigrationCourses: vi.fn(async () => undefined),
    replaceMigrationTasks: vi.fn(async () => undefined),
    replaceMigrationCourses: vi.fn(async () => undefined),
  };
}

describe("local workspace migration", () => {
  it("imports tasks and courses before clearing either local source", async () => {
    const events: string[] = [];
    const source = createSource();
    vi.mocked(source.clearMigrationTasks).mockImplementation(async () => { events.push("clear-tasks"); });
    vi.mocked(source.clearMigrationCourses).mockImplementation(async () => { events.push("clear-courses"); });
    const target: CloudWorkspaceMigrationTarget = {
      tasks: { importTasks: async () => { events.push("import-tasks"); return [task]; } },
      courses: { importCourses: async () => { events.push("import-courses"); return [course]; } },
    };

    await expect(migrateLocalWorkspaceToCloud(source, target)).resolves.toEqual({
      taskCount: 1,
      courseCount: 1,
    });
    expect(events).toEqual([
      "import-tasks",
      "import-courses",
      "clear-tasks",
      "clear-courses",
    ]);
  });

  it("preserves all local data when a cloud import fails", async () => {
    const source = createSource();
    const target: CloudWorkspaceMigrationTarget = {
      tasks: { importTasks: async () => [task] },
      courses: { importCourses: async () => { throw new Error("offline"); } },
    };
    await expect(migrateLocalWorkspaceToCloud(source, target)).rejects.toThrow("offline");
    expect(source.clearMigrationTasks).not.toHaveBeenCalled();
    expect(source.clearMigrationCourses).not.toHaveBeenCalled();
  });

  it("restores snapshots when a local clear fails", async () => {
    const source = createSource();
    vi.mocked(source.clearMigrationCourses).mockRejectedValue(new Error("blocked"));
    const target: CloudWorkspaceMigrationTarget = {
      tasks: { importTasks: async () => [task] },
      courses: { importCourses: async () => [course] },
    };
    await expect(migrateLocalWorkspaceToCloud(source, target)).rejects.toThrow("blocked");
    expect(source.replaceMigrationTasks).toHaveBeenCalledWith([task]);
    expect(source.replaceMigrationCourses).toHaveBeenCalledWith([course]);
  });

  it("supports duplicate-safe course migration retries", async () => {
    const source = createSource();
    let clears = 0;
    vi.mocked(source.clearMigrationCourses).mockImplementation(async () => {
      clears += 1;
      if (clears === 1) throw new Error("blocked");
    });
    const cloudCourses = new Map<string, Course>();
    const target: CloudWorkspaceMigrationTarget = {
      tasks: { importTasks: async () => [task] },
      courses: {
        importCourses: async (courses) => {
          courses.forEach((item) => cloudCourses.set(getCourseDedupeKey(item), item));
          return [...cloudCourses.values()];
        },
      },
    };

    await expect(migrateLocalWorkspaceToCloud(source, target)).rejects.toThrow();
    await expect(migrateLocalWorkspaceToCloud(source, target)).resolves.toMatchObject({ courseCount: 1 });
    expect(cloudCourses.size).toBe(1);
  });
});
