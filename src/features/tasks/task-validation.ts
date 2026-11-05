import { isValidDateKey } from "@/lib/date";
import { isTaskEventType, normalizeTaskEventType, type TaskEventType, type CreateTaskInput } from "@/types/task";

export const TASK_FORM_LIMITS = {
  title: 160,
  description: 2000,
  category: 80,
} as const;

export interface TaskFormValues {
  title: string;
  description: string;
  category: string;
  eventType?: TaskEventType;
  dueDate: string;
  dueTime: string;
}

export type TaskFormErrorCode =
  | "eventTypeInvalid"
  | "titleRequired"
  | "titleTooLong"
  | "descriptionTooLong"
  | "categoryRequired"
  | "categoryTooLong"
  | "dueDateRequired"
  | "dueDateInvalid"
  | "dueTimeInvalid";

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, TaskFormErrorCode>>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateTaskForm(values: TaskFormValues): TaskFormErrors {
  const errors: TaskFormErrors = {};
  if (values.eventType !== undefined && !isTaskEventType(values.eventType)) errors.eventType = "eventTypeInvalid";
  const title = values.title.trim();
  const category = values.category.trim();

  if (!title) errors.title = "titleRequired";
  else if (title.length > TASK_FORM_LIMITS.title) errors.title = "titleTooLong";

  if (values.description.trim().length > TASK_FORM_LIMITS.description) {
    errors.description = "descriptionTooLong";
  }

  if (!category) errors.category = "categoryRequired";
  else if (category.length > TASK_FORM_LIMITS.category) {
    errors.category = "categoryTooLong";
  }

  if (!values.dueDate) errors.dueDate = "dueDateRequired";
  else if (!isValidDateKey(values.dueDate)) errors.dueDate = "dueDateInvalid";

  if (values.dueTime && !TIME_PATTERN.test(values.dueTime)) {
    errors.dueTime = "dueTimeInvalid";
  }

  return errors;
}

export function toCreateTaskInput(values: TaskFormValues): CreateTaskInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    eventType: normalizeTaskEventType(values.eventType),
    dueDate: values.dueDate,
    dueTime: values.dueTime || null,
  };
}
