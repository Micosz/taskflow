import { describe, expect, it } from "vitest";
import {
  COURSE_STORAGE_KEY,
  LocalCourseRepository,
} from "@/data/local-course-repository";

const NOW = new Date("2026-09-04T08:00:00.000Z");

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function createRepository(storage: Storage) {
  return new LocalCourseRepository({ storage, now: () => NOW });
}

describe("LocalCourseRepository", () => {
  it("creates, edits, and deletes saved courses", async () => {
    const repository = createRepository(new MemoryStorage());
    const created = await repository.createCourse({
      code: "CS361",
      name: "Cloud Architecting",
    });
    expect(await repository.getCourses()).toEqual([created]);

    const updated = await repository.updateCourse(created.id, {
      name: "Cloud Architecture",
    });
    expect(updated.name).toBe("Cloud Architecture");

    await repository.deleteCourse(created.id);
    expect(await repository.getCourses()).toEqual([]);
  });

  it("persists courses across repository recreation", async () => {
    const storage = new MemoryStorage();
    await createRepository(storage).createCourse({ code: "CS263" });

    const restored = await createRepository(storage).getCourses();
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ code: "CS263", name: "" });
    expect(storage.getItem(COURSE_STORAGE_KEY)).not.toBeNull();
  });

  it("prevents case-insensitive duplicates by code or fallback name", async () => {
    const repository = createRepository(new MemoryStorage());
    await repository.createCourse({ code: "CS361", name: "Cloud" });
    await expect(repository.createCourse({ code: "cs361", name: "Different" }))
      .rejects.toMatchObject({ code: "duplicate" });

    const byName = createRepository(new MemoryStorage());
    await byName.createCourse({ name: "Research" });
    await expect(byName.createCourse({ name: "research" }))
      .rejects.toMatchObject({ code: "duplicate" });
  });

  it("only clears migration data after persistence succeeds", async () => {
    const storage = new MemoryStorage();
    const repository = createRepository(storage);
    await repository.createCourse({ code: "CS264" });
    await repository.clearMigrationCourses();

    expect(await repository.getMigrationCourses()).toEqual([]);
    expect(await repository.getCourses()).toEqual([]);
  });
});
