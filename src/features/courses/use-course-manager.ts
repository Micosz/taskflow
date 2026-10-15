import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { CourseRepository } from "@/data/course-repository";
import type { CreateCourseInput, UpdateCourseInput } from "@/types/course";
import {
  createCourseManagerState,
  reduceCourseManagerState,
} from "./course-manager-state";

interface UseCourseManagerOptions {
  enabled?: boolean;
  repository: CourseRepository;
  scopeKey: string;
}

export function useCourseManager({
  enabled = true,
  repository,
  scopeKey,
}: UseCourseManagerOptions) {
  const [state, dispatch] = useReducer(
    reduceCourseManagerState,
    createCourseManagerState(scopeKey),
  );
  const visibleState = useMemo(
    () =>
      state.scopeKey === scopeKey
        ? state
        : createCourseManagerState(scopeKey),
    [scopeKey, state],
  );

  const loadCourses = useCallback(async () => {
    if (!enabled) return;
    dispatch({ type: "loading", scopeKey });
    try {
      const courses = await repository.getCourses();
      dispatch({ type: "loaded", scopeKey, courses });
    } catch {
      dispatch({ type: "failed", scopeKey });
    }
  }, [enabled, repository, scopeKey]);

  useEffect(() => {
    dispatch({ type: "switch_scope", scopeKey });
    if (!enabled) return;
    let active = true;
    const unsubscribe = repository.subscribe((courses) => {
      if (active) dispatch({ type: "loaded", scopeKey, courses });
    });
    void repository
      .getCourses()
      .then((courses) => {
        if (active) dispatch({ type: "loaded", scopeKey, courses });
      })
      .catch(() => {
        if (active) dispatch({ type: "failed", scopeKey });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, repository, scopeKey]);

  const createCourse = useCallback(
    async (input: CreateCourseInput) => {
      const course = await repository.createCourse(input);
      dispatch({ type: "upserted", scopeKey, course });
      return course;
    },
    [repository, scopeKey],
  );
  const updateCourse = useCallback(
    async (id: string, input: UpdateCourseInput) => {
      const course = await repository.updateCourse(id, input);
      dispatch({ type: "upserted", scopeKey, course });
      return course;
    },
    [repository, scopeKey],
  );
  const deleteCourse = useCallback(
    async (id: string) => {
      await repository.deleteCourse(id);
      dispatch({ type: "deleted", scopeKey, courseId: id });
    },
    [repository, scopeKey],
  );

  return {
    courses: visibleState.courses,
    status: visibleState.status,
    createCourse,
    updateCourse,
    deleteCourse,
    loadCourses,
  };
}
