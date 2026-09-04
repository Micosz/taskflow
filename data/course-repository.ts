import type {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
} from "@/types/course";

export type CourseRepositoryListener = (courses: readonly Course[]) => void;

export interface CourseRepository {
  getCourses(): Promise<Course[]>;
  createCourse(input: CreateCourseInput): Promise<Course>;
  updateCourse(id: string, input: UpdateCourseInput): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  subscribe(listener: CourseRepositoryListener): () => void;
}

export type CourseRepositoryErrorCode =
  | "duplicate"
  | "invalid_input"
  | "not_found"
  | "storage_unavailable";

export class CourseRepositoryError extends Error {
  constructor(
    public readonly code: CourseRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CourseRepositoryError";
  }
}
