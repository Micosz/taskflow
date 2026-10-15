import { localCourseRepository } from "@/data/local-course-repository";
import { localTaskRepository } from "@/data/local-task-repository";
import type { LocalWorkspaceMigrationSource } from "@/data/workspace-migration";

export const localWorkspaceMigrationSource: LocalWorkspaceMigrationSource = {
  getMigrationTasks: () => localTaskRepository.getMigrationTasks(),
  clearMigrationTasks: () => localTaskRepository.clearMigrationTasks(),
  replaceMigrationTasks: (tasks) =>
    localTaskRepository.replaceMigrationTasks(tasks),
  getMigrationCourses: () => localCourseRepository.getMigrationCourses(),
  clearMigrationCourses: () => localCourseRepository.clearMigrationCourses(),
  replaceMigrationCourses: (courses) =>
    localCourseRepository.replaceMigrationCourses(courses),
};
