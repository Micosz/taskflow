export interface Course {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  code?: string;
  name?: string;
}

export type UpdateCourseInput = Partial<Pick<Course, "code" | "name">>;

export function getCourseDisplayLabel(
  course: Pick<Course, "code" | "name">,
): string {
  const code = course.code.trim();
  const name = course.name.trim();
  if (code && name && code.toLowerCase() !== name.toLowerCase()) {
    return `${code} — ${name}`;
  }
  return code || name;
}

export function getCourseDedupeKey(
  course: Pick<Course, "code" | "name">,
): string {
  return (course.code.trim() || course.name.trim()).toLowerCase();
}
