import { localCourseRepository } from "@/data/local-course-repository";
import {
  selectCourseRepository,
  type CourseRepositorySelection,
} from "@/data/course-repository-selection";
import { SupabaseCourseRepository } from "@/data/supabase-course-repository";
import type { CloudCourseMigrationTarget } from "@/data/workspace-migration";
import type { TaskFlowSupabaseClient } from "@/lib/supabase/client";

export interface SessionCourseRepositorySelection
  extends CourseRepositorySelection {
  migrationTarget: CloudCourseMigrationTarget | null;
}

export function createSessionCourseRepositorySelection(
  authenticatedUserId: string | null,
  client: TaskFlowSupabaseClient | null,
): SessionCourseRepositorySelection {
  if (!authenticatedUserId || !client) {
    return {
      ...selectCourseRepository(null, {
        localRepository: localCourseRepository,
        createCloudRepository: () => localCourseRepository,
      }),
      migrationTarget: null,
    };
  }
  const cloudRepository = new SupabaseCourseRepository(authenticatedUserId, {
    client,
  });
  return {
    ...selectCourseRepository(authenticatedUserId, {
      localRepository: localCourseRepository,
      createCloudRepository: () => cloudRepository,
    }),
    migrationTarget: cloudRepository,
  };
}
