import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, Check, Clock3, Sparkles, X } from "lucide-react";
import {
  TASK_FORM_LIMITS,
  toCreateTaskInput,
  validateTaskForm,
  type TaskFormErrorCode,
  type TaskFormErrors,
  type TaskFormValues,
} from "@/features/tasks/task-validation";
import { toDateKey } from "@/lib/date";
import { interpolate, type TranslationMessages } from "@/i18n";
import {
  findCourseForCategory,
  OTHER_COURSE_OPTION,
  resolveTaskCategory,
} from "@/features/courses/course-options";
import { getCourseDisplayLabel, type Course } from "@/types/course";
import type { CreateTaskInput, Task } from "@/types/task";
import { useDialogA11y } from "./use-dialog-a11y";

interface TaskFormDialogProps {
  open: boolean;
  task: Task | null;
  courses: readonly Course[];
  courseStatus: "loading" | "ready" | "error";
  messages: TranslationMessages;
  onClose: () => void;
  onManageCourses: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
}

function initialValues(task: Task | null): TaskFormValues {
  return task
    ? {
        title: task.title,
        description: task.description,
        category: task.category,
        dueDate: task.dueDate,
        dueTime: task.dueTime ?? "",
      }
    : {
        title: "",
        description: "",
        category: "",
        dueDate: toDateKey(),
        dueTime: "",
      };
}

export function TaskFormDialog({
  open,
  task,
  courses,
  courseStatus,
  messages,
  onClose,
  onManageCourses,
  onSubmit,
}: TaskFormDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [values, setValues] = useState<TaskFormValues>(() => initialValues(task));
  const initialCourse = task ? findCourseForCategory(courses, task.category) : null;
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialCourse?.id ?? (task || courses.length === 0 ? OTHER_COURSE_OPTION : ""),
  );
  const [customCategory, setCustomCategory] = useState(
    initialCourse ? "" : task?.category ?? "",
  );
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useDialogA11y(open, dialogRef, onClose);

  const updateField = <Key extends keyof TaskFormValues>(
    key: Key,
    value: TaskFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const errorMessage = (code: TaskFormErrorCode): string => {
    const text = messages.validation[code];
    if (code === "titleTooLong") {
      return interpolate(text, { count: TASK_FORM_LIMITS.title });
    }
    if (code === "descriptionTooLong") {
      return interpolate(text, { count: TASK_FORM_LIMITS.description });
    }
    if (code === "categoryTooLong") {
      return interpolate(text, { count: TASK_FORM_LIMITS.category });
    }
    return text;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submittedValues = {
      ...values,
      category: resolveTaskCategory(
        courses,
        selectedCourseId,
        customCategory,
        values.category,
      ),
    };
    const nextErrors = validateTaskForm(submittedValues);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      const targetName = firstField === "category" ? "courseSelection" : firstField;
      dialogRef.current?.querySelector<HTMLElement>(`[name="${targetName}"]`)?.focus();
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(toCreateTaskInput(submittedValues));
    } finally {
      setIsSaving(false);
    }
  };

  const fieldError = (field: keyof TaskFormValues) => {
    const error = errors[field];
    return error ? (
      <p id={`${field}-error`} className="mt-1.5 text-xs font-medium text-rose-300">
        {errorMessage(error)}
      </p>
    ) : null;
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-50 flex items-end justify-center bg-[#050611]/75 backdrop-blur-md sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="modal-sheet glass-panel relative flex w-full max-w-[650px] flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem]"
            initial={reduceMotion ? false : { opacity: 0, y: 42, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="flex items-start justify-between border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex min-w-0 gap-3.5">
                <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400/25 to-cyan-400/15 text-violet-200 ring-1 ring-inset ring-violet-300/20">
                  <Sparkles aria-hidden="true" size={19} />
                </div>
                <div>
                  <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">
                    {task ? messages.form.editTitle : messages.form.addTitle}
                  </h2>
                  <p id={descriptionId} className="mt-1 max-w-md text-sm leading-5 text-[#959ab8]">
                    {task ? messages.form.editSubtitle : messages.form.addSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={messages.form.close}
                onClick={onClose}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[#9da2bf] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#d9dbee]">
                    {messages.form.titleLabel}
                  </span>
                  <input
                    data-autofocus
                    name="title"
                    value={values.title}
                    maxLength={TASK_FORM_LIMITS.title + 1}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder={messages.form.titlePlaceholder}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? "title-error" : undefined}
                    className="form-field"
                    autoComplete="off"
                  />
                  {fieldError("title")}
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-sm font-medium text-[#d9dbee]">
                    {messages.form.descriptionLabel}
                    <span className="text-xs font-normal text-[#737997]">{messages.form.optional}</span>
                  </span>
                  <textarea
                    name="description"
                    rows={3}
                    value={values.description}
                    maxLength={TASK_FORM_LIMITS.description + 1}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder={messages.form.descriptionPlaceholder}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? "description-error" : undefined}
                    className="form-field min-h-24 resize-y"
                  />
                  {fieldError("description")}
                </label>

                <div>
                  <div className="block">
                    <span className="mb-2 block text-sm font-medium text-[#d9dbee]">
                      {messages.form.categoryLabel}
                    </span>
                    <select
                      name="courseSelection"
                      value={selectedCourseId}
                      disabled={courseStatus === "loading"}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setSelectedCourseId(nextId);
                        updateField(
                          "category",
                          resolveTaskCategory(courses, nextId, customCategory),
                        );
                      }}
                      aria-invalid={Boolean(errors.category)}
                      aria-describedby={errors.category ? "category-error" : undefined}
                      className="form-field"
                    >
                      {courseStatus === "loading" ? (
                        <option value="">{messages.courses.loading}</option>
                      ) : null}
                      {courseStatus !== "loading" && courses.length === 0 ? (
                        <option value="" disabled>{messages.courses.noSavedOption}</option>
                      ) : null}
                      {courses.length > 0 ? (
                        <option value="" disabled>{messages.form.categoryPlaceholder}</option>
                      ) : null}
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {getCourseDisplayLabel(course)}
                        </option>
                      ))}
                      <option value={OTHER_COURSE_OPTION}>{messages.courses.other}</option>
                    </select>
                    {selectedCourseId === OTHER_COURSE_OPTION ? (
                      <label className="mt-3 block">
                        <span className="mb-2 block text-xs font-medium text-[#aeb2c9]">
                          {messages.form.otherCategoryLabel}
                        </span>
                        <input
                          name="category"
                          value={customCategory}
                          maxLength={TASK_FORM_LIMITS.category + 1}
                          onChange={(event) => {
                            setCustomCategory(event.target.value);
                            updateField("category", event.target.value);
                          }}
                          placeholder={messages.form.otherCategoryPlaceholder}
                          aria-invalid={Boolean(errors.category)}
                          aria-describedby={errors.category ? "category-error" : undefined}
                          className="form-field"
                          autoComplete="off"
                        />
                      </label>
                    ) : null}
                    <button
                      type="button"
                      onClick={onManageCourses}
                      className="mt-2 min-h-10 text-xs font-semibold text-violet-200 transition hover:text-white"
                    >
                      {courses.length === 0 ? messages.courses.add : messages.form.manageCourses}
                    </button>
                    {fieldError("category")}
                  </div>

                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#d9dbee]">
                      <CalendarDays aria-hidden="true" size={15} className="text-violet-300" />
                      {messages.form.dueDateLabel}
                    </span>
                    <input
                      type="date"
                      name="dueDate"
                      value={values.dueDate}
                      onChange={(event) => updateField("dueDate", event.target.value)}
                      aria-invalid={Boolean(errors.dueDate)}
                      aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
                      className="form-field"
                    />
                    {fieldError("dueDate")}
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-sm font-medium text-[#d9dbee]">
                      <span className="flex items-center gap-2">
                        <Clock3 aria-hidden="true" size={15} className="text-cyan-300" />
                        {messages.form.dueTimeLabel}
                      </span>
                      <span className="text-xs font-normal text-[#737997]">{messages.form.optional}</span>
                    </span>
                    <input
                      type="time"
                      name="dueTime"
                      value={values.dueTime}
                      onChange={(event) => updateField("dueTime", event.target.value)}
                      aria-invalid={Boolean(errors.dueTime)}
                      aria-describedby={errors.dueTime ? "dueTime-error" : undefined}
                      className="form-field"
                    />
                    {fieldError("dueTime")}
                  </label>
                </div>
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-12 rounded-xl border border-white/[0.09] px-5 text-sm font-semibold text-[#b8bcd2] transition hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
                >
                  {messages.form.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="button-sheen relative min-h-12 overflow-hidden rounded-xl bg-gradient-to-r from-[#8d79ff] via-[#7564f5] to-[#4bbbd8] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(105,86,240,0.28)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 active:scale-[0.98]"
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    <Check aria-hidden="true" size={17} />
                    {isSaving
                      ? messages.form.saving
                      : task
                        ? messages.form.save
                        : messages.form.create}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
