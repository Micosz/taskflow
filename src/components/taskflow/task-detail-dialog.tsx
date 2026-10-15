import { useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

import {
  formatDate,
  formatTime,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import type { Task } from "@/types/task";

import { TaskCountdown } from "./task-countdown";
import { useDialogA11y } from "./use-dialog-a11y";

interface TaskDetailDialogProps {
  task: Task | null;
  locale: Locale;
  messages: TranslationMessages;
  busy?: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function MetadataItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-[#7f85a3]">
        <Icon aria-hidden="true" size={14} className="text-violet-300/80" />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-[#e5e6f2]">{value}</p>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  locale,
  messages,
  busy = false,
  onClose,
  onEdit,
  onToggle,
  onDelete,
}: TaskDetailDialogProps) {
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useDialogA11y(Boolean(task), dialogRef, onClose);

  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          className="safe-overlay fixed inset-0 z-50 flex items-end justify-center bg-[#050611]/78 backdrop-blur-md sm:items-center sm:py-8"
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
            className="modal-sheet glass-panel relative flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] sm:rounded-[1.75rem]"
            initial={reduceMotion ? false : { opacity: 0, y: 38, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 410, damping: 35 }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />

            <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/80">
                  {messages.details.title}
                </p>
                <h2
                  id={titleId}
                  className={`mt-2 break-words text-xl font-semibold leading-7 tracking-[-0.025em] sm:text-2xl sm:leading-8 ${
                    task.completed ? "text-[#a7abc0] line-through decoration-[#7770a8]" : "text-white"
                  }`}
                >
                  {task.title}
                </h2>
                <p id={descriptionId} className="sr-only">
                  {messages.details.dialogDescription}
                </p>
              </div>
              <button
                data-autofocus
                type="button"
                aria-label={messages.details.close}
                onClick={onClose}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[#9da2bf] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${
                    task.completed
                      ? "border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200"
                      : "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-100"
                  }`}
                >
                  {task.completed ? <Check aria-hidden="true" size={14} /> : <Circle aria-hidden="true" size={13} />}
                  {task.completed ? messages.details.completed : messages.details.incomplete}
                </span>
                <TaskCountdown task={task} locale={locale} messages={messages} />
              </div>

              <section className="mt-6" aria-labelledby={`${descriptionId}-heading`}>
                <div className="flex items-center gap-2">
                  <FileText aria-hidden="true" size={16} className="text-violet-300" />
                  <h3 id={`${descriptionId}-heading`} className="text-sm font-semibold text-[#dfe1ef]">
                    {messages.details.description}
                  </h3>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-white/[0.07] bg-[#080a18]/45 p-4 text-sm leading-7 text-[#b7bbcf] sm:p-5">
                  {task.description || messages.details.noDescription}
                </p>
              </section>

              <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label={messages.details.metadata}>
                <MetadataItem icon={BookOpen} label={messages.details.course} value={task.category} />
                <MetadataItem
                  icon={CalendarDays}
                  label={messages.details.dueDate}
                  value={formatDate(task.dueDate, locale, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
                <MetadataItem
                  icon={Clock3}
                  label={messages.details.dueTime}
                  value={task.dueTime ? formatTime(task.dueTime, locale) : messages.task.noDueTime}
                />
                <MetadataItem
                  icon={Clock3}
                  label={messages.details.created}
                  value={formatDate(task.createdAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                />
                <MetadataItem
                  icon={Clock3}
                  label={messages.details.updated}
                  value={formatDate(task.updatedAt, locale, { dateStyle: "medium", timeStyle: "short" })}
                />
              </section>
            </div>

            <footer className="grid gap-2 border-t border-white/[0.07] bg-[#0b0d1d]/75 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:justify-end sm:px-7 sm:pb-4">
              <button
                type="button"
                onClick={() => onDelete(task)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300/12 bg-rose-300/[0.05] px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/[0.09] active:scale-[0.98] sm:mr-auto"
              >
                <Trash2 aria-hidden="true" size={17} />
                {messages.details.delete}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggle(task)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.09] px-4 text-sm font-semibold text-[#d2d5e4] transition hover:bg-white/[0.05] hover:text-white disabled:cursor-wait disabled:opacity-60 active:scale-[0.98]"
              >
                {task.completed ? <RotateCcw aria-hidden="true" size={17} /> : <Check aria-hidden="true" size={17} />}
                {task.completed ? messages.details.reopen : messages.details.markComplete}
              </button>
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="button-sheen relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#8d79ff] via-[#7564f5] to-[#4bbbd8] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(105,86,240,0.24)] transition hover:brightness-110 active:scale-[0.98]"
              >
                <Pencil aria-hidden="true" size={17} className="relative z-10" />
                <span className="relative z-10">{messages.details.edit}</span>
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
