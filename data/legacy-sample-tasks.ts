import type { Task } from "@/types/task";

/** IDs used by the demo workspace that shipped before guest mode started empty. */
export const LEGACY_SAMPLE_TASK_IDS = [
  "sample-cs263-requirement-diagram",
  "sample-cs361-readme",
  "sample-cloud-architecture-notes",
  "sample-project-presentation",
  "sample-submit-assignment",
  "sample-research-references",
  "sample-review-sprint-feedback",
] as const;

const legacySampleTaskIds = new Set<string>(LEGACY_SAMPLE_TASK_IDS);

export const LEGACY_SAMPLE_MIGRATION_KEYS = LEGACY_SAMPLE_TASK_IDS.map(
  (id) => `local-v1:${id}`,
);

export function removeLegacySampleTasks(tasks: readonly Task[]): Task[] {
  return tasks.filter((task) => !legacySampleTaskIds.has(task.id));
}
