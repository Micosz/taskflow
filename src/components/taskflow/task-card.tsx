import { motion, useReducedMotion } from "motion/react";
import { BookOpen, CalendarDays, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  formatNumber,
  interpolate,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import { formatCompactDate, getDayDifference } from "@/lib/date";
import type { Task } from "@/types/task";
import { TaskCountdown } from "./task-countdown";

interface TaskCardProps {
  task: Task;
  locale: Locale;
  messages: TranslationMessages;
  busy?: boolean;
  selected?: boolean;
  onSelect: (task: Task) => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

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
  selected = false,
  onSelect,
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
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.24 }}
      className="editorial-task-item"
    >
      <article
        className="editorial-task-row"
        data-overdue={isOverdue || undefined}
        data-today={isDueToday || undefined}
        data-completed={task.completed || undefined}
        data-selected={selected || undefined}
      >
        <button
          type="button"
          aria-label={interpolate(messages.task.showPreview, { title: task.title })}
          aria-pressed={selected}
          onClick={() => onSelect(task)}
          className="absolute inset-0 z-10 focus:outline-none"
        />

        <label className="relative z-20 -m-2 grid min-h-11 min-w-11 cursor-pointer place-items-center">
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
            className="task-checkbox peer-focus-visible:ring-2 peer-focus-visible:ring-[#a7b49c] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#090b0a]"
            whileTap={reduceMotion ? undefined : { scale: 0.84 }}
          >
            <Check size={14} strokeWidth={2.5} />
          </motion.span>
        </label>

        <div className="min-w-0 flex-1">
          <h4 className="editorial-task-title">{task.title}</h4>
          {task.description && (
            <p className="editorial-task-description">{task.description}</p>
          )}
          <div className="editorial-task-course">
            <BookOpen aria-hidden="true" size={14} strokeWidth={1.45} />
            <span>{task.category}</span>
          </div>
        </div>

        <div className="editorial-task-due">
          <span
            className="editorial-task-due__label"
            data-overdue={isOverdue || undefined}
            data-today={isDueToday || undefined}
          >
            <CalendarDays aria-hidden="true" size={13} strokeWidth={1.45} />
            {getDueLabel(task, locale, messages)}
          </span>
          <TaskCountdown task={task} locale={locale} messages={messages} />
        </div>

        <div className="editorial-task-actions">
          <MoreHorizontal aria-hidden="true" className="editorial-more-icon" size={18} />
          <motion.button
            type="button"
            aria-label={`${messages.task.edit}: ${task.title}`}
            onClick={() => onEdit(task)}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          >
            <Pencil aria-hidden="true" size={15} />
          </motion.button>
          <motion.button
            type="button"
            aria-label={`${messages.task.delete}: ${task.title}`}
            onClick={() => onDelete(task)}
            whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          >
            <Trash2 aria-hidden="true" size={15} />
          </motion.button>
        </div>
      </article>
    </motion.li>
  );
}
