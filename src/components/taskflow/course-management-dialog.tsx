import { useCallback, useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { CourseRepositoryError } from "@/data/course-repository";
import { interpolate, type TranslationMessages } from "@/i18n";
import { getCourseDisplayLabel, type Course, type CreateCourseInput } from "@/types/course";
import { useDialogA11y } from "./use-dialog-a11y";

interface CourseManagementDialogProps {
  open: boolean;
  courses: readonly Course[];
  status: "loading" | "ready" | "error";
  messages: TranslationMessages;
  onClose: () => void;
  onCreate: (input: CreateCourseInput) => Promise<Course>;
  onUpdate: (id: string, input: CreateCourseInput) => Promise<Course>;
  onDelete: (id: string) => Promise<void>;
  onRetry: () => Promise<void>;
  onNotify: (title: string, description: string, tone?: "success" | "error") => void;
}

const CODE_LIMIT = 32;
const NAME_LIMIT = 120;

export function CourseManagementDialog({
  open,
  courses,
  status,
  messages,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onRetry,
  onNotify,
}: CourseManagementDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = useCallback(() => {
    setEditingCourse(null);
    setShowForm(false);
    setCode("");
    setName("");
    setFieldError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    setDeleteTarget(null);
    onClose();
  }, [onClose, resetForm]);

  useDialogA11y(open, dialogRef, handleClose);

  const startAdd = () => {
    setEditingCourse(null);
    setCode("");
    setName("");
    setFieldError(null);
    setShowForm(true);
  };

  const startEdit = (course: Course) => {
    setEditingCourse(course);
    setCode(course.code);
    setName(course.name);
    setFieldError(null);
    setShowForm(true);
  };

  const validate = (): string | null => {
    if (!code.trim() && !name.trim()) return messages.courses.required;
    if (code.trim().length > CODE_LIMIT) {
      return interpolate(messages.courses.codeTooLong, { count: CODE_LIMIT });
    }
    if (name.trim().length > NAME_LIMIT) {
      return interpolate(messages.courses.nameTooLong, { count: NAME_LIMIT });
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setIsSaving(true);
    setFieldError(null);
    try {
      const input = { code, name };
      if (editingCourse) {
        await onUpdate(editingCourse.id, input);
        onNotify(messages.courses.updated, messages.courses.updatedDescription);
      } else {
        await onCreate(input);
        onNotify(messages.courses.added, messages.courses.addedDescription);
      }
      resetForm();
    } catch (error) {
      if (error instanceof CourseRepositoryError && error.code === "duplicate") {
        setFieldError(messages.courses.duplicate);
      } else {
        onNotify(
          messages.courses.error,
          messages.courses.errorDescription,
          "error",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      onNotify(messages.courses.deleted, messages.courses.deletedDescription);
    } catch {
      onNotify(messages.courses.error, messages.courses.errorDescription, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-[60] flex items-end justify-center bg-[#050611]/80 backdrop-blur-md sm:items-center sm:py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role={deleteTarget ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="modal-sheet glass-panel w-full max-w-2xl overflow-y-auto rounded-t-[1.75rem] p-5 sm:rounded-[1.75rem] sm:p-7"
            initial={reduceMotion ? false : { opacity: 0, y: 38, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 390, damping: 34 }}
          >
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

            {deleteTarget ? (
              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-rose-400/10 text-rose-200 ring-1 ring-inset ring-rose-300/15">
                  <Trash2 aria-hidden="true" size={21} />
                </div>
                <h2 id={titleId} className="mt-5 text-xl font-semibold text-white">
                  {messages.courses.deleteTitle}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#9ca1bd]">
                  {interpolate(messages.courses.deleteDescription, {
                    course: getCourseDisplayLabel(deleteTarget),
                  })}
                </p>
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    data-autofocus
                    autoFocus
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="min-h-12 rounded-xl border border-white/[0.09] px-5 text-sm font-semibold text-[#b8bcd2] transition hover:bg-white/[0.05] hover:text-white"
                  >
                    {messages.courses.keep}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleDelete()}
                    className="min-h-12 rounded-xl border border-rose-300/20 bg-rose-400/12 px-5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/18 disabled:cursor-wait disabled:opacity-60"
                  >
                    {messages.courses.confirmDelete}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3.5">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-violet-200 ring-1 ring-inset ring-violet-300/15">
                      <BookOpen aria-hidden="true" size={19} />
                    </div>
                    <div>
                      <h2 id={titleId} className="text-xl font-semibold tracking-[-0.025em] text-white">
                        {messages.courses.title}
                      </h2>
                      <p id={descriptionId} className="mt-1 text-sm text-[#989db8]">
                        {messages.courses.subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    data-autofocus={!showForm ? true : undefined}
                    type="button"
                    aria-label={messages.courses.close}
                    onClick={handleClose}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-[#969bb8] transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <X aria-hidden="true" size={20} />
                  </button>
                </div>

                {showForm ? (
                  <form onSubmit={handleSubmit} noValidate className="mt-6 rounded-2xl border border-violet-300/10 bg-violet-400/[0.035] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">
                        {editingCourse ? messages.courses.edit : messages.courses.add}
                      </h3>
                      <button type="button" onClick={resetForm} className="text-xs font-semibold text-[#9ba0bc] hover:text-white">
                        {messages.courses.cancel}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#8086a3]">{messages.courses.requirement}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 flex items-center justify-between text-xs font-semibold text-[#d7d9ea]">
                          {messages.courses.codeLabel}
                          <span className="font-normal text-[#747a98]">{messages.courses.optional}</span>
                        </span>
                        <input
                          data-autofocus
                          autoFocus
                          value={code}
                          maxLength={CODE_LIMIT + 1}
                          onChange={(event) => {
                            setCode(event.target.value);
                            setFieldError(null);
                          }}
                          placeholder={messages.courses.codePlaceholder}
                          aria-invalid={Boolean(fieldError)}
                          aria-describedby={fieldError ? "course-form-error" : undefined}
                          className="form-field"
                          autoComplete="off"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 flex items-center justify-between text-xs font-semibold text-[#d7d9ea]">
                          {messages.courses.nameLabel}
                          <span className="font-normal text-[#747a98]">{messages.courses.optional}</span>
                        </span>
                        <input
                          value={name}
                          maxLength={NAME_LIMIT + 1}
                          onChange={(event) => {
                            setName(event.target.value);
                            setFieldError(null);
                          }}
                          placeholder={messages.courses.namePlaceholder}
                          aria-invalid={Boolean(fieldError)}
                          aria-describedby={fieldError ? "course-form-error" : undefined}
                          className="form-field"
                          autoComplete="off"
                        />
                      </label>
                    </div>
                    {fieldError ? <p id="course-form-error" role="alert" className="mt-3 text-xs font-medium text-rose-300">{fieldError}</p> : null}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(105,86,240,0.2)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
                      >
                        <Check aria-hidden="true" size={16} />
                        {isSaving ? messages.courses.saving : messages.courses.save}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/15"
                  >
                    <Plus aria-hidden="true" size={16} />
                    {messages.courses.add}
                  </button>
                )}

                <div className="mt-5">
                  {status === "loading" ? (
                    <p className="py-10 text-center text-sm text-[#8f94b0]">{messages.courses.loading}</p>
                  ) : status === "error" ? (
                    <div className="rounded-2xl border border-rose-300/10 bg-rose-400/[0.035] p-6 text-center">
                      <p className="text-sm text-rose-100">{messages.courses.errorDescription}</p>
                      <button type="button" onClick={() => void onRetry()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/[0.06] px-4 text-xs font-semibold text-white">
                        <RotateCcw aria-hidden="true" size={14} />
                        {messages.courses.retry}
                      </button>
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-9 text-center">
                      <BookOpen aria-hidden="true" className="mx-auto text-violet-300/70" size={24} />
                      <h3 className="mt-3 text-sm font-semibold text-white">{messages.courses.emptyTitle}</h3>
                      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#888eaa]">{messages.courses.emptyDescription}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2" aria-label={messages.courses.title}>
                      {courses.map((course) => (
                        <li key={course.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/10 p-3.5">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400/[0.08] text-cyan-200">
                            <BookOpen aria-hidden="true" size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{getCourseDisplayLabel(course)}</p>
                            {course.code && course.name ? <p className="mt-0.5 truncate text-[11px] text-[#7f85a2]">{course.code} · {course.name}</p> : null}
                          </div>
                          <button type="button" aria-label={`${messages.courses.edit}: ${getCourseDisplayLabel(course)}`} onClick={() => startEdit(course)} className="grid size-11 shrink-0 place-items-center rounded-xl text-[#969bb6] transition hover:bg-white/[0.06] hover:text-white">
                            <Pencil aria-hidden="true" size={16} />
                          </button>
                          <button type="button" aria-label={`${messages.courses.delete}: ${getCourseDisplayLabel(course)}`} onClick={() => setDeleteTarget(course)} className="grid size-11 shrink-0 place-items-center rounded-xl text-rose-300/75 transition hover:bg-rose-400/10 hover:text-rose-200">
                            <Trash2 aria-hidden="true" size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
