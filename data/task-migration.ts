import type { Task } from "@/types/task";

const MIGRATION_DISMISSALS_KEY = "taskflow:v1:migration-dismissals";

export interface LocalTaskMigrationSource {
  clearMigrationTasks(): Promise<void>;
  getMigrationTasks(): Promise<Task[]>;
}

export interface CloudTaskMigrationTarget {
  importTasks(tasks: readonly Task[]): Promise<Task[]>;
}

export interface TaskMigrationResult {
  importedTasks: Task[];
  migratedCount: number;
}

/**
 * Copies first and clears second. Any cloud or local persistence failure leaves
 * the source data available, while the cloud target handles retry idempotency.
 */
export async function migrateLocalTasksToCloud(
  source: LocalTaskMigrationSource,
  target: CloudTaskMigrationTarget,
): Promise<TaskMigrationResult> {
  const localTasks = await source.getMigrationTasks();
  if (localTasks.length === 0) {
    return { importedTasks: [], migratedCount: 0 };
  }

  const importedTasks = await target.importTasks(localTasks);
  await source.clearMigrationTasks();

  return {
    importedTasks,
    migratedCount: localTasks.length,
  };
}

export function createTaskMigrationFingerprint(tasks: readonly Task[]): string {
  const source = [...tasks]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((task) => `${task.id}:${task.updatedAt}`)
    .join("|");

  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${tasks.length}:${(hash >>> 0).toString(36)}`;
}

function getBrowserStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readDismissals(storage: Storage): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(MIGRATION_DISMISSALS_KEY) ?? "{}",
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function isTaskMigrationDismissed(
  userId: string,
  fingerprint: string,
  storage?: Storage | null,
): boolean {
  const target = getBrowserStorage(storage);
  return target ? readDismissals(target)[userId] === fingerprint : false;
}

export function persistTaskMigrationDismissal(
  userId: string,
  fingerprint: string,
  storage?: Storage | null,
): void {
  const target = getBrowserStorage(storage);
  if (!target) return;
  try {
    target.setItem(
      MIGRATION_DISMISSALS_KEY,
      JSON.stringify({ ...readDismissals(target), [userId]: fingerprint }),
    );
  } catch {
    // A dismissal is optional; migration safety never depends on this value.
  }
}
