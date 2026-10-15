import {
  CourseRepositoryError,
  type CourseRepository,
  type CourseRepositoryListener,
} from "@/data/course-repository";
import {
  getCourseDedupeKey,
  type Course,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/types/course";

export const COURSE_STORAGE_KEY = "taskflow:v1:courses";

const STORAGE_VERSION = 1;
const CODE_LIMIT = 32;
const NAME_LIMIT = 120;

interface StoredCourses {
  version: typeof STORAGE_VERSION;
  savedAt: string;
  courses: Course[];
}

export interface LocalCourseRepositoryOptions {
  storage?: Storage | null;
  now?: () => Date;
}

function cloneCourses(courses: readonly Course[]): Course[] {
  return courses.map((course) => ({ ...course }));
}

function normalizeText(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeInput(input: CreateCourseInput): Pick<Course, "code" | "name"> {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name);
  if (!code && !name) {
    throw new CourseRepositoryError(
      "invalid_input",
      "A course code or name is required.",
    );
  }
  if (code.length > CODE_LIMIT || name.length > NAME_LIMIT) {
    throw new CourseRepositoryError(
      "invalid_input",
      "The course code or name is too long.",
    );
  }
  return { code, name };
}

function isCourse(value: unknown): value is Course {
  if (!value || typeof value !== "object") return false;
  const course = value as Record<string, unknown>;
  return (
    typeof course.id === "string" &&
    typeof course.code === "string" &&
    typeof course.name === "string" &&
    Boolean(course.code.trim() || course.name.trim()) &&
    typeof course.createdAt === "string" &&
    typeof course.updatedAt === "string"
  );
}

function parseStoredCourses(raw: string): Course[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const payload = parsed as Partial<StoredCourses>;
    if (
      payload.version !== STORAGE_VERSION ||
      !Array.isArray(payload.courses) ||
      !payload.courses.every(isCourse)
    ) {
      return null;
    }
    return cloneCourses(payload.courses);
  } catch {
    return null;
  }
}

function createCourseId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `course-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortCourses(courses: readonly Course[]): Course[] {
  return cloneCourses(courses).sort((left, right) =>
    getCourseDedupeKey(left).localeCompare(getCourseDedupeKey(right)),
  );
}

export class LocalCourseRepository implements CourseRepository {
  private readonly listeners = new Set<CourseRepositoryListener>();
  private readonly now: () => Date;
  private readonly storageOverride: Storage | null | undefined;
  private volatileCourses: Course[] | null = null;
  private isListeningForStorage = false;

  constructor(options: LocalCourseRepositoryOptions = {}) {
    this.storageOverride = options.storage;
    this.now = options.now ?? (() => new Date());
  }

  async getCourses(): Promise<Course[]> {
    return sortCourses(this.readCourses());
  }

  async getMigrationCourses(): Promise<Course[]> {
    return this.getCourses();
  }

  async clearMigrationCourses(): Promise<void> {
    const previous = await this.getMigrationCourses();
    const storage = this.getStorage();
    if (!storage) {
      this.volatileCourses = [];
      this.notify([]);
      return;
    }
    if (!this.writeCourses([])) {
      this.volatileCourses = previous;
      throw new CourseRepositoryError(
        "storage_unavailable",
        "Local courses could not be cleared after cloud migration.",
      );
    }
    this.notify([]);
  }

  async replaceMigrationCourses(courses: readonly Course[]): Promise<void> {
    if (!this.writeCourses(courses) && this.getStorage()) {
      throw new CourseRepositoryError(
        "storage_unavailable",
        "Local courses could not be restored.",
      );
    }
    this.notify(courses);
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    const normalized = normalizeInput(input);
    const courses = this.readCourses();
    this.assertUnique(normalized, courses);
    const now = this.now().toISOString();
    const course: Course = {
      id: createCourseId(),
      ...normalized,
      createdAt: now,
      updatedAt: now,
    };
    const next = sortCourses([course, ...courses]);
    this.writeCourses(next);
    this.notify(next);
    return { ...course };
  }

  async updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
    const courses = this.readCourses();
    const index = courses.findIndex((course) => course.id === id);
    if (index === -1) {
      throw new CourseRepositoryError("not_found", "Course was not found.");
    }
    const current = courses[index];
    const normalized = normalizeInput({
      code: input.code ?? current.code,
      name: input.name ?? current.name,
    });
    this.assertUnique(normalized, courses, id);
    const updated: Course = {
      ...current,
      ...normalized,
      updatedAt: this.now().toISOString(),
    };
    const next = sortCourses(
      courses.map((course) => (course.id === id ? updated : course)),
    );
    this.writeCourses(next);
    this.notify(next);
    return { ...updated };
  }

  async deleteCourse(id: string): Promise<void> {
    const courses = this.readCourses();
    const next = courses.filter((course) => course.id !== id);
    if (next.length === courses.length) {
      throw new CourseRepositoryError("not_found", "Course was not found.");
    }
    this.writeCourses(next);
    this.notify(next);
  }

  subscribe(listener: CourseRepositoryListener): () => void {
    this.listeners.add(listener);
    this.startStorageListener();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stopStorageListener();
    };
  }

  private assertUnique(
    value: Pick<Course, "code" | "name">,
    courses: readonly Course[],
    ignoredId?: string,
  ): void {
    const key = getCourseDedupeKey(value);
    if (
      courses.some(
        (course) => course.id !== ignoredId && getCourseDedupeKey(course) === key,
      )
    ) {
      throw new CourseRepositoryError(
        "duplicate",
        "A saved course with this code or name already exists.",
      );
    }
  }

  private getStorage(): Storage | null {
    if (this.storageOverride !== undefined) return this.storageOverride;
    try {
      return typeof window === "undefined" ? null : window.localStorage;
    } catch {
      return null;
    }
  }

  private readCourses(): Course[] {
    const storage = this.getStorage();
    if (storage) {
      try {
        const raw = storage.getItem(COURSE_STORAGE_KEY);
        if (raw !== null) {
          const parsed = parseStoredCourses(raw);
          if (parsed) {
            this.volatileCourses = parsed;
            return cloneCourses(parsed);
          }
        }
      } catch {
        // Fall back to the session copy when browser storage is unavailable.
      }
    }
    return this.volatileCourses ? cloneCourses(this.volatileCourses) : [];
  }

  private writeCourses(courses: readonly Course[]): boolean {
    const next = cloneCourses(courses);
    this.volatileCourses = next;
    const storage = this.getStorage();
    if (!storage) return false;
    const payload: StoredCourses = {
      version: STORAGE_VERSION,
      savedAt: this.now().toISOString(),
      courses: next,
    };
    try {
      storage.setItem(COURSE_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  private notify(courses: readonly Course[]): void {
    const snapshot = sortCourses(courses);
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private readonly handleStorage = (event: StorageEvent): void => {
    if (event.key !== COURSE_STORAGE_KEY && event.key !== null) return;
    this.volatileCourses = null;
    this.notify(this.readCourses());
  };

  private startStorageListener(): void {
    if (this.isListeningForStorage || typeof window === "undefined") return;
    window.addEventListener("storage", this.handleStorage);
    this.isListeningForStorage = true;
  }

  private stopStorageListener(): void {
    if (!this.isListeningForStorage || typeof window === "undefined") return;
    window.removeEventListener("storage", this.handleStorage);
    this.isListeningForStorage = false;
  }
}

export const localCourseRepository = new LocalCourseRepository();
