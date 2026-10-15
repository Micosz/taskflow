import type { TaskRepository } from "@/data/task-repository";

export type TaskStorageMode = "local" | "cloud";

export interface TaskRepositorySelection {
  mode: TaskStorageMode;
  repository: TaskRepository;
  scopeKey: string;
}

interface SelectTaskRepositoryOptions {
  localRepository: TaskRepository;
  createCloudRepository: (userId: string) => TaskRepository;
}

/** Selects persistence from verified auth state without exposing it to task UI. */
export function selectTaskRepository(
  authenticatedUserId: string | null,
  options: SelectTaskRepositoryOptions,
): TaskRepositorySelection {
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
