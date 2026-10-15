import { getCourseDedupeKey, type Course } from "@/types/course";

function sortCourses(courses: readonly Course[]): Course[] {
  return [...courses].sort((left, right) =>
    getCourseDedupeKey(left).localeCompare(getCourseDedupeKey(right)),
  );
}

export type CourseLoadStatus = "loading" | "ready" | "error";

export interface CourseManagerState {
  scopeKey: string;
  status: CourseLoadStatus;
  courses: Course[];
}

export type CourseManagerAction =
  | { type: "switch_scope"; scopeKey: string }
  | { type: "loading"; scopeKey: string }
  | { type: "loaded"; scopeKey: string; courses: readonly Course[] }
  | { type: "failed"; scopeKey: string }
  | { type: "upserted"; scopeKey: string; course: Course }
  | { type: "deleted"; scopeKey: string; courseId: string };

export function createCourseManagerState(scopeKey: string): CourseManagerState {
  return { scopeKey, status: "loading", courses: [] };
}

export function reduceCourseManagerState(
  state: CourseManagerState,
  action: CourseManagerAction,
): CourseManagerState {
  if (action.type === "switch_scope") {
    return action.scopeKey === state.scopeKey
      ? state
      : createCourseManagerState(action.scopeKey);
  }
  if (action.scopeKey !== state.scopeKey) return state;
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading" };
    case "loaded":
      return { ...state, status: "ready", courses: sortCourses(action.courses) };
    case "failed":
      return { ...state, status: "error" };
    case "upserted": {
      const exists = state.courses.some(({ id }) => id === action.course.id);
      const courses = exists
        ? state.courses.map((course) =>
            course.id === action.course.id ? action.course : course,
          )
        : [action.course, ...state.courses];
      return { ...state, status: "ready", courses: sortCourses(courses) };
    }
    case "deleted":
      return {
        ...state,
        courses: state.courses.filter(({ id }) => id !== action.courseId),
      };
  }
}
