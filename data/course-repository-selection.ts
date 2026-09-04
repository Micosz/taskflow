import type { CourseRepository } from "@/data/course-repository";
import type { TaskStorageMode } from "@/data/repository-selection";

export interface CourseRepositorySelection {
  mode: TaskStorageMode;
  repository: CourseRepository;
  scopeKey: string;
}

interface SelectCourseRepositoryOptions {
  localRepository: CourseRepository;
  createCloudRepository: (userId: string) => CourseRepository;
}

export function selectCourseRepository(
  authenticatedUserId: string | null,
  options: SelectCourseRepositoryOptions,
): CourseRepositorySelection {
  if (!authenticatedUserId) {
    return {
      mode: "local",
      repository: options.localRepository,
      scopeKey: "local",
    };
  }
  return {
    mode: "cloud",
    repository: options.createCloudRepository(authenticatedUserId),
    scopeKey: `cloud:${authenticatedUserId}`,
  };
}
