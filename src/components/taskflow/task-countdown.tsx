"use client";

import { useMemo } from "react";
import { Timer } from "lucide-react";
import { interpolate, type Locale, type TranslationMessages } from "@/i18n";
import {
  formatCountdown,
  getCountdownFromDeadline,
  getTaskDeadline,
  type CountdownUrgency,
} from "@/features/tasks/task-countdown";
import { useNow } from "@/features/tasks/use-now";
import { formatClockTime, formatCompactDate } from "@/lib/date";
import type { Task } from "@/types/task";

interface TaskCountdownProps {
  task: Task;
  locale: Locale;
  messages: TranslationMessages;
}

const urgencyStyle: Record<CountdownUrgency, string> = {
  normal: "border-cyan-300/10 bg-cyan-300/[0.035] text-cyan-100",
  soon: "border-violet-300/15 bg-violet-300/[0.06] text-violet-100",
  near: "border-amber-300/15 bg-amber-300/[0.07] text-amber-100",
  urgent: "border-rose-300/20 bg-rose-300/[0.08] text-rose-100",
  overdue: "border-rose-300/20 bg-rose-300/[0.08] text-rose-200",
};

export function TaskCountdown({ task, locale, messages }: TaskCountdownProps) {
  if (task.completed || !task.dueDate) return null;

  return <ActiveTaskCountdown task={task} locale={locale} messages={messages} />;
}

function ActiveTaskCountdown({ task, locale, messages }: TaskCountdownProps) {
  const now = useNow();
  const deadline = useMemo(
    () => getTaskDeadline({ dueDate: task.dueDate, dueTime: task.dueTime }),
    [task.dueDate, task.dueTime],
  );
  const countdown = useMemo(
    () => (now === null ? null : getCountdownFromDeadline(deadline, now)),
    [deadline, now],
  );

  const accessibleDeadline = task.dueTime
    ? interpolate(messages.countdown.deadlineAt, {
        date: formatCompactDate(task.dueDate, locale),
        time: formatClockTime(task.dueTime, locale),
      })
    : interpolate(messages.countdown.deadlineEndOfDay, {
        date: formatCompactDate(task.dueDate, locale),
      });

  if (!countdown || countdown.status === "completed") {
    return (
      <div className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-[#777d99]">
        <Timer aria-hidden="true" size={14} />
        <span aria-hidden="true" className="font-mono text-xs tabular-nums">
          {messages.countdown.loading}
        </span>
        <span className="sr-only">{accessibleDeadline}</span>
      </div>
    );
  }

  const duration = formatCountdown(countdown.parts, messages.countdown.units);
  const visualLabel = interpolate(
    countdown.status === "overdue"
      ? messages.countdown.overdueBy
      : messages.countdown.remaining,
    { duration },
  );

  return (
    <div
      className={`mt-3 inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-300 ${urgencyStyle[countdown.urgency]}`}
      title={accessibleDeadline}
    >
      <Timer aria-hidden="true" size={14} className="shrink-0 opacity-80" />
      <span
        aria-hidden="true"
        className="whitespace-nowrap font-mono text-[0.7rem] font-semibold tabular-nums tracking-[0.015em] sm:text-xs"
      >
        {visualLabel}
      </span>
      <span className="sr-only">{accessibleDeadline}</span>
    </div>
  );
}
