import { getCourseDisplayLabel, type Course } from "@/types/course";

export const OTHER_COURSE_OPTION = "__taskflow_other__";

export function findCourseForCategory(
  courses: readonly Course[],
  category: string,
): Course | null {
  const normalized = category.trim().toLowerCase();
  return (
    courses.find(
      (course) => getCourseDisplayLabel(course).toLowerCase() === normalized,
    ) ?? null
  );
}

export function resolveTaskCategory(
  courses: readonly Course[],
  selectedCourseId: string,
  customCategory: string,
  fallbackCategory = "",
): string {
  if (selectedCourseId === OTHER_COURSE_OPTION) return customCategory.trim();
  const course = courses.find(({ id }) => id === selectedCourseId);
  return course ? getCourseDisplayLabel(course) : fallbackCategory.trim();
}
