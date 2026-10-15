import { localTaskRepository } from "@/data/local-task-repository";
import {
  selectTaskRepository,
  type TaskRepositorySelection,
} from "@/data/repository-selection";
import { SupabaseTaskRepository } from "@/data/supabase-task-repository";
import type { CloudTaskMigrationTarget } from "@/data/task-migration";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";

export interface SessionTaskRepositorySelection
  extends TaskRepositorySelection {
  migrationTarget: CloudTaskMigrationTarget | null;
}

/** Keeps Supabase construction inside the data layer used by the task UI. */
export function createSessionTaskRepositorySelection(
  authenticatedUserId: string | null,
  client: TaskFlowSupabaseClient | null,
): SessionTaskRepositorySelection {
  if (!authenticatedUserId || !client) {
    return {
      ...selectTaskRepository(null, {
        localRepository: localTaskRepository,
        createCloudRepository: () => localTaskRepository,
      }),
      migrationTarget: null,
    };
  }

  const cloudRepository = new SupabaseTaskRepository(authenticatedUserId, {
    client,
  });

  return {
    ...selectTaskRepository(authenticatedUserId, {
      localRepository: localTaskRepository,
      createCloudRepository: () => cloudRepository,
    }),
    migrationTarget: cloudRepository,
  };
}
