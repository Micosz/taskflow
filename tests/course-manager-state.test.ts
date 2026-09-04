import { describe, expect, it, vi } from "vitest";
import { selectCourseRepository } from "@/data/course-repository-selection";
import type { CourseRepository } from "@/data/course-repository";
import {
  createCourseManagerState,
  reduceCourseManagerState,
} from "@/features/courses/course-manager-state";
import type { Course } from "@/types/course";

const localRepository = {} as CourseRepository;

function course(id: string): Course {
  return {
    id,
    code: id.toUpperCase(),
    name: "Course",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("course repository scopes", () => {
  it("selects local or user-scoped cloud storage from auth state", () => {
    const createCloudRepository = vi.fn(() => ({} as CourseRepository));
    expect(selectCourseRepository(null, { localRepository, createCloudRepository }))
      .toMatchObject({ mode: "local", scopeKey: "local" });
    expect(createCloudRepository).not.toHaveBeenCalled();

    expect(selectCourseRepository("user-a", { localRepository, createCloudRepository }))
      .toMatchObject({ mode: "cloud", scopeKey: "cloud:user-a" });
    expect(createCloudRepository).toHaveBeenCalledWith("user-a");
  });

  it("clears courses immediately and ignores late user-A data after switching", () => {
    let state = createCourseManagerState("cloud:user-a");
    state = reduceCourseManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      courses: [course("a")],
    });
    state = reduceCourseManagerState(state, {
      type: "switch_scope",
      scopeKey: "cloud:user-b",
    });
    state = reduceCourseManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      courses: [course("late-a")],
    });
    expect(state).toMatchObject({ scopeKey: "cloud:user-b", courses: [] });
  });

  it("replaces realtime snapshots without duplicate courses", () => {
    let state = createCourseManagerState("cloud:user-a");
    state = reduceCourseManagerState(state, {
      type: "upserted",
      scopeKey: "cloud:user-a",
      course: course("one"),
    });
    state = reduceCourseManagerState(state, {
      type: "loaded",
      scopeKey: "cloud:user-a",
      courses: [course("one")],
    });
    expect(state.courses.map(({ id }) => id)).toEqual(["one"]);
  });
});
