import { describe, expect, it } from "vitest";
import {
  findCourseForCategory,
  OTHER_COURSE_OPTION,
  resolveTaskCategory,
} from "@/features/courses/course-options";
import { getCourseDisplayLabel, type Course } from "@/types/course";
import type { Task } from "@/types/task";

const course: Course = {
  id: "course-1",
  code: "CS361",
  name: "Cloud Architecting",
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
};

describe("saved-course task options", () => {
  it("stores the saved course display label as a task snapshot", () => {
    expect(resolveTaskCategory([course], course.id, "ignored")).toBe(
      "CS361 — Cloud Architecting",
    );
    expect(findCourseForCategory([course], "cs361 — cloud architecting")?.id)
      .toBe(course.id);
  });

  it("keeps Other as a task-only custom category", () => {
    expect(resolveTaskCategory([course], OTHER_COURSE_OPTION, " Personal "))
      .toBe("Personal");
    expect(course).toMatchObject({ code: "CS361", name: "Cloud Architecting" });
  });

  it("keeps task history intact when a saved course is renamed or deleted", () => {
    const task: Task = {
      id: "task-1",
      title: "Architecture review",
      description: "",
      category: getCourseDisplayLabel(course),
      priority: "medium",
      dueDate: "2026-09-04",
      dueTime: null,
      completed: false,
      createdAt: "2026-09-04T00:00:00.000Z",
      updatedAt: "2026-09-04T00:00:00.000Z",
    };
    const renamed = { ...course, name: "Advanced Cloud" };

    expect(task.category).toBe("CS361 — Cloud Architecting");
    expect(getCourseDisplayLabel(renamed)).toBe("CS361 — Advanced Cloud");
    expect(resolveTaskCategory([], OTHER_COURSE_OPTION, task.category)).toBe(
      task.category,
    );
    expect(resolveTaskCategory([], course.id, "", task.category)).toBe(
      task.category,
    );
  });
});
