import {
  CourseRepositoryError,
  type CourseRepository,
  type CourseRepositoryListener,
} from "@/data/course-repository";
import {
  createSupabaseBrowserClient,
  type TaskFlowSupabaseClient,
} from "@/lib/supabase/client";
import type {
  CourseInsert,
  CourseRow,
  CourseUpdate,
} from "@/lib/supabase/database.types";
import {
  getCourseDedupeKey,
  type Course,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/types/course";

const COURSE_TOPIC_PREFIX = "taskflow:courses:";
const CODE_LIMIT = 32;
const NAME_LIMIT = 120;

export interface SupabaseCourseRepositoryOptions {
  client?: TaskFlowSupabaseClient;
  onRealtimeError?: (error: unknown) => void;
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

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    code: row.code ?? "",
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPayload(input: CreateCourseInput): CourseInsert {
  const normalized = normalizeInput(input);
  return {
    code: normalized.code || null,
    name: normalized.name,
  };
}

function createMigrationPayload(course: Course): CourseInsert {
  const normalized = normalizeInput(course);
  return {
    code: normalized.code || null,
    name: normalized.name,
    created_at: course.createdAt,
    updated_at: course.updatedAt,
  };
}

function isSameCourseContent(
  left: Pick<Course, "code" | "name">,
  right: Pick<Course, "code" | "name">,
): boolean {
  return (
    normalizeText(left.code).toLowerCase() === normalizeText(right.code).toLowerCase() &&
    normalizeText(left.name).toLowerCase() === normalizeText(right.name).toLowerCase()
  );
}

function throwDataError(
  action: string,
  error: { code?: string; message: string },
): never {
  if (error.code === "23505") {
    throw new CourseRepositoryError("duplicate", error.message, {
      cause: error,
    });
  }
  if (error.code === "23502" || error.code === "23514") {
    throw new CourseRepositoryError("invalid_input", error.message, {
      cause: error,
    });
  }
  throw new Error(`Unable to ${action}: ${error.message}`, { cause: error });
}

export class SupabaseCourseRepository implements CourseRepository {
  private readonly client: TaskFlowSupabaseClient;
  private readonly onRealtimeError: (error: unknown) => void;

  constructor(
    private readonly userId: string,
    options: SupabaseCourseRepositoryOptions = {},
  ) {
    if (!userId.trim()) throw new Error("A verified Supabase user id is required.");
    this.client = options.client ?? createSupabaseBrowserClient();
    this.onRealtimeError = options.onRealtimeError ?? (() => undefined);
  }

  async getCourses(): Promise<Course[]> {
    const { data, error } = await this.client
      .from("courses")
      .select("*")
      .order("dedupe_key", { ascending: true });
    if (error) throwDataError("load courses", error);
    return data.map(toCourse);
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    const { data, error } = await this.client
      .from("courses")
      .insert(createPayload(input))
      .select("*")
      .single();
    if (error) throwDataError("create the course", error);
    return toCourse(data);
  }

  async updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
    const existing = await this.client
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) throwDataError("load the course", existing.error);
    if (!existing.data) {
      throw new CourseRepositoryError("not_found", "Course was not found.");
    }

    const normalized = normalizeInput({
      code: input.code ?? existing.data.code ?? "",
      name: input.name ?? existing.data.name,
    });
    const payload: CourseUpdate = {
      code: normalized.code || null,
      name: normalized.name,
    };
    const { data, error } = await this.client
      .from("courses")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throwDataError("update the course", error);
    if (!data) {
      throw new CourseRepositoryError("not_found", "Course was not found.");
    }
    return toCourse(data);
  }

  async deleteCourse(id: string): Promise<void> {
    const { data, error } = await this.client
      .from("courses")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throwDataError("delete the course", error);
    if (data.length === 0) {
      throw new CourseRepositoryError("not_found", "Course was not found.");
    }
  }

  async importCourses(courses: readonly Course[]): Promise<Course[]> {
    if (courses.length === 0) return [];
    const uniqueSources = [...new Map(
      courses.map((course) => [getCourseDedupeKey(course), course]),
    ).values()];
    const payloads = uniqueSources.map(createMigrationPayload);
    const dedupeKeys = uniqueSources.map(getCourseDedupeKey);
    const sourceByKey = new Map(
      uniqueSources.map((course) => [getCourseDedupeKey(course), course]),
    );
    const { data: existing, error: existingError } = await this.client
      .from("courses")
      .select("*")
      .in("dedupe_key", dedupeKeys);
    if (existingError) throwDataError("check migrated courses", existingError);
    if (
      existing.some((row) => {
        const source = sourceByKey.get(row.dedupe_key);
        return source && !isSameCourseContent(source, toCourse(row));
      })
    ) {
      throw new CourseRepositoryError(
        "duplicate",
        "A cloud course uses the same code with different details.",
      );
    }

    const { error: importError } = await this.client
      .from("courses")
      .upsert(payloads, {
        ignoreDuplicates: true,
        onConflict: "user_id,dedupe_key",
      });
    if (importError) throwDataError("migrate local courses", importError);

    const { data, error } = await this.client
      .from("courses")
      .select("*")
      .in("dedupe_key", dedupeKeys);
    if (error) throwDataError("verify migrated courses", error);
    if (
      data.length !== new Set(dedupeKeys).size ||
      data.some((row) => {
        const source = sourceByKey.get(row.dedupe_key);
        return !source || !isSameCourseContent(source, toCourse(row));
      })
    ) {
      throw new Error("Cloud migration could not verify every local course.");
    }
    return data.map(toCourse);
  }

  subscribe(listener: CourseRepositoryListener): () => void {
    let disposed = false;
    let cleanedUp = false;
    const channel = this.client
      .channel(`${COURSE_TOPIC_PREFIX}${this.userId}`, {
        config: { private: true },
      })
      .on("broadcast", { event: "INSERT" }, () =>
        this.refresh(listener, () => disposed),
      )
      .on("broadcast", { event: "UPDATE" }, () =>
        this.refresh(listener, () => disposed),
      )
      .on("broadcast", { event: "DELETE" }, () =>
        this.refresh(listener, () => disposed),
      );

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      void this.client.removeChannel(channel);
    };

    void this.client.realtime
      .setAuth()
      .then(() => {
        if (disposed) return cleanup();
        channel.subscribe((status, error) => {
          if (!disposed && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
            this.onRealtimeError(
              error ?? new Error(`Supabase realtime subscription ${status}.`),
            );
          }
        });
      })
      .catch((error: unknown) => {
        if (!disposed) this.onRealtimeError(error);
        cleanup();
      });

    return () => {
      disposed = true;
      cleanup();
    };
  }

  private refresh(
    listener: CourseRepositoryListener,
    isDisposed: () => boolean,
  ): void {
    if (isDisposed()) return;
    void this.getCourses()
      .then((courses) => {
        if (!isDisposed()) listener(courses);
      })
      .catch(this.onRealtimeError);
  }
}
