import { motion, useReducedMotion } from "motion/react";
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  formatNumber,
  interpolate,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import { formatClockTime, formatCompactDate, getDayDifference } from "@/lib/date";
import type { Task, TaskPriority } from "@/types/task";
import { TaskCountdown } from "./task-countdown";

interface TaskCardProps {
  task: Task;
  locale: Locale;
  messages: TranslationMessages;
  busy?: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const priorityStyle: Record<TaskPriority, string> = {
  low: "border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200",
  medium: "border-amber-300/15 bg-amber-300/[0.07] text-amber-100",
  high: "border-rose-300/15 bg-rose-300/[0.07] text-rose-200",
};

const accentStyle: Record<TaskPriority, string> = {
  low: "from-cyan-300/70 via-cyan-300/15",
  medium: "from-amber-300/80 via-amber-300/15",
  high: "from-rose-300/85 via-rose-300/15",
};

function getDueLabel(task: Task, locale: Locale, messages: TranslationMessages) {
  const difference = getDayDifference(task.dueDate);

  if (difference === 0) return messages.task.dueToday;
  if (difference === 1) return messages.task.dueTomorrow;
  if (difference === -1) return messages.task.dueYesterday;
  if (difference < -1 && !task.completed) {
    return interpolate(messages.task.overdueBy, {
      count: formatNumber(Math.abs(difference), locale),
    });
  }
  return formatCompactDate(task.dueDate, locale);
}

export function TaskCard({
  task,
  locale,
  messages,
  busy = false,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const reduceMotion = useReducedMotion();
  const dayDifference = getDayDifference(task.dueDate);
  const isOverdue = dayDifference < 0 && !task.completed;
  const isDueToday = dayDifference === 0 && !task.completed;

  return (
    <motion.li
      layout={reduceMotion ? false : "position"}
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 36 }
      }
    >
      <article
        className={`task-card-surface group rounded-[1.35rem] p-4 sm:rounded-[1.45rem] sm:p-[1.1rem] ${
          task.completed ? "bg-white/[0.018]" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-6 left-0 w-px bg-gradient-to-b ${accentStyle[task.priority]} to-transparent ${
            task.completed ? "opacity-20" : "opacity-90"
          }`}
        />
        {task.completed && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-emerald-200/[0.06] to-transparent"
            initial={reduceMotion ? false : { left: "-45%" }}
            animate={{ left: "125%" }}
            transition={{ duration: reduceMotion ? 0 : 0.62, ease: "easeOut" }}
          />
        )}

        <div className="flex items-start gap-3 sm:gap-4">
          <label className="-m-2 grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-xl">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={task.completed}
              disabled={busy}
              onChange={() => onToggle(task)}
              aria-label={interpolate(
                task.completed ? messages.task.markIncomplete : messages.task.markComplete,
                { title: task.title },
              )}
            />
            <motion.span
              aria-hidden="true"
              data-checked={task.completed}
              className="task-checkbox peer-focus-visible:ring-2 peer-focus-visible:ring-violet-300 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111329]"
              whileTap={reduceMotion ? undefined : { scale: 0.82 }}
              animate={task.completed && !reduceMotion ? { scale: [1, 1.16, 1] } : { scale: 1 }}
            >
              <Check size={15} strokeWidth={3} />
            </motion.span>
          </label>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h3
                  className={`text-[0.95rem] font-semibold leading-6 tracking-[-0.015em] transition sm:text-base ${
                    task.completed ? "text-[#a0a5bd] line-through decoration-[#7770a8]" : "text-[#f2f2fb]"
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p
                    className={`mt-1 line-clamp-2 text-xs leading-5 sm:text-[0.8rem] ${
                      task.completed ? "text-[#858aa4]" : "text-[#9297b3]"
                    }`}
                  >
                    {task.description}
                  </p>
                )}
                <TaskCountdown task={task} locale={locale} messages={messages} />
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:-mr-1 sm:-mt-1">
                {task.completed && (
                  <span className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-300/[0.06] px-2 py-1 text-[0.65rem] font-semibold text-emerald-200 sm:mr-1">
                    <Check aria-hidden="true" size={11} strokeWidth={2.7} />
                    {messages.task.completed}
                  </span>
                )}
                <motion.button
                  type="button"
                  aria-label={`${messages.task.edit}: ${task.title}`}
                  onClick={() => onEdit(task)}
                  className="grid size-10 place-items-center rounded-xl text-[#858aa6] transition hover:bg-violet-300/[0.08] hover:text-violet-200 active:bg-violet-300/[0.12]"
                  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                >
                  <Pencil aria-hidden="true" size={16} />
                </motion.button>
                <motion.button
                  type="button"
                  aria-label={`${messages.task.delete}: ${task.title}`}
                  onClick={() => onDelete(task)}
                  className="grid size-10 place-items-center rounded-xl text-[#858aa6] transition hover:bg-rose-300/[0.08] hover:text-rose-200 active:bg-rose-300/[0.12]"
                  whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </motion.button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 text-[0.68rem] font-medium text-[#9ba0bb]">
                <BookOpen aria-hidden="true" size={12} className="text-violet-300/80" />
                {task.category}
              </span>
              <span
                className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[0.66rem] font-semibold ${priorityStyle[task.priority]}`}
              >
                {messages.priority[task.priority]}
              </span>
              <span
                className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[0.68rem] font-medium ${
                  isOverdue
                    ? "border-rose-300/15 bg-rose-300/[0.07] text-rose-200"
                    : isDueToday
                      ? "border-violet-300/15 bg-violet-300/[0.07] text-violet-200"
                      : "border-white/[0.07] bg-white/[0.035] text-[#8f94af]"
                }`}
              >
                <CalendarDays aria-hidden="true" size={12} />
                {getDueLabel(task, locale, messages)}
              </span>
              {task.dueTime && (
                <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 text-[0.68rem] font-medium text-[#8f94af]">
                  <Clock3 aria-hidden="true" size={12} />
                  {formatClockTime(task.dueTime, locale)}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </motion.li>
  );
}
