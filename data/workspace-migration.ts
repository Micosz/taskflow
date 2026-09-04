import { createTaskMigrationFingerprint } from "@/data/task-migration";
import type { Course } from "@/types/course";
import type { Task } from "@/types/task";

export interface LocalWorkspaceMigrationSource {
  clearMigrationCourses(): Promise<void>;
  clearMigrationTasks(): Promise<void>;
  getMigrationCourses(): Promise<Course[]>;
  getMigrationTasks(): Promise<Task[]>;
  replaceMigrationCourses(courses: readonly Course[]): Promise<void>;
  replaceMigrationTasks(tasks: readonly Task[]): Promise<void>;
}

export interface CloudCourseMigrationTarget {
  importCourses(courses: readonly Course[]): Promise<Course[]>;
}

export interface CloudWorkspaceMigrationTarget {
  courses: CloudCourseMigrationTarget;
  tasks: {
    importTasks(tasks: readonly Task[]): Promise<Task[]>;
  };
}

export interface WorkspaceMigrationData {
  courses: Course[];
  tasks: Task[];
}

export interface WorkspaceMigrationResult {
  courseCount: number;
  taskCount: number;
}

export function createCourseMigrationFingerprint(
  courses: readonly Course[],
): string {
  const source = [...courses]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((course) => `${course.id}:${course.updatedAt}`)
    .join("|");
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${courses.length}:${(hash >>> 0).toString(36)}`;
}

export function createWorkspaceMigrationFingerprint(
  data: WorkspaceMigrationData,
): string {
  return `${createTaskMigrationFingerprint(data.tasks)}:${createCourseMigrationFingerprint(data.courses)}`;
}

export async function readLocalWorkspaceMigrationData(
  source: LocalWorkspaceMigrationSource,
): Promise<WorkspaceMigrationData> {
  const [tasks, courses] = await Promise.all([
    source.getMigrationTasks(),
    source.getMigrationCourses(),
  ]);
  return { tasks, courses };
}

/**
 * Imports and verifies every cloud record before clearing local data. If a
 * local clear fails, both snapshots are restored so the user can retry safely.
 */
export async function migrateLocalWorkspaceToCloud(
  source: LocalWorkspaceMigrationSource,
  target: CloudWorkspaceMigrationTarget,
): Promise<WorkspaceMigrationResult> {
  const data = await readLocalWorkspaceMigrationData(source);
  if (data.tasks.length > 0) await target.tasks.importTasks(data.tasks);
  if (data.courses.length > 0) await target.courses.importCourses(data.courses);

  try {
    if (data.tasks.length > 0) await source.clearMigrationTasks();
    if (data.courses.length > 0) await source.clearMigrationCourses();
  } catch (error) {
    await Promise.allSettled([
      source.replaceMigrationTasks(data.tasks),
      source.replaceMigrationCourses(data.courses),
    ]);
    throw error;
  }

  return { taskCount: data.tasks.length, courseCount: data.courses.length };
}
