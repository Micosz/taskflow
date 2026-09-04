"use client";

import { ArrowUpRight, BookOpen, CalendarDays, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  formatNumber,
  getGreetingPeriod,
  interpolate,
  type Locale,
  type TranslationMessages,
} from "@/i18n";
import { formatClockTime, formatLongDate } from "@/lib/date";
import type { Task } from "@/types/task";
import { TaskCountdown } from "./task-countdown";

interface FocusHeroProps {
  task: Task | null;
  now: Date;
  locale: Locale;
  messages: TranslationMessages;
  completed: number;
  total: number;
  busy: boolean;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
}

export function FocusHero({
  task,
  now,
  locale,
  messages,
  completed,
  total,
  busy,
  onOpen,
  onToggle,
}: FocusHeroProps) {
  const reduceMotion = useReducedMotion();
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal);
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  const progressText = interpolate(messages.stats.progressValue, {
    completed: formatNumber(safeCompleted, locale),
    total: formatNumber(safeTotal, locale),
  });
  const greeting = messages.greeting[getGreetingPeriod(now)];

  return (
    <motion.section
      aria-label={messages.stats.focusProgress}
      className="editorial-focus"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div aria-hidden="true" className="editorial-focus__atmosphere" />
      <div aria-hidden="true" className="editorial-focus__shade" />

      <div className="editorial-focus__content">
        <div>
          <p className="editorial-kicker">{greeting}</p>
          <p className="editorial-date">{formatLongDate(now, locale)}</p>
        </div>

        <div className="editorial-focus__task">
          {task ? (
            <>
              <button
                type="button"
                className="editorial-focus__title group text-left"
                onClick={() => onOpen(task)}
                aria-label={interpolate(messages.task.openDetails, { title: task.title })}
              >
                <span>{task.title}</span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="mt-3 size-7 shrink-0 text-[#9aaa91] opacity-0 transition group-hover:opacity-100"
                  strokeWidth={1.4}
                />
              </button>
              {task.description && (
                <p className="editorial-focus__description">{task.description}</p>
              )}

              <div className="editorial-focus__deadline">
                <span className="editorial-label">{messages.task.due}</span>
                <TaskCountdown task={task} locale={locale} messages={messages} />
              </div>

              <div className="editorial-focus__meta">
                <span>
                  <BookOpen aria-hidden="true" size={17} strokeWidth={1.5} />
                  {task.category}
                </span>
                <span>
                  <CalendarDays aria-hidden="true" size={17} strokeWidth={1.5} />
                  {task.dueTime ? formatClockTime(task.dueTime, locale) : messages.task.noDueTime}
                </span>
              </div>
            </>
          ) : (
            <>
              <h2 className="editorial-focus__title">{messages.empty.activeTitle}</h2>
              <p className="editorial-focus__description">{messages.empty.activeDescription}</p>
            </>
          )}
        </div>

        <div className="editorial-focus__footer">
          <div className="editorial-progress">
            <div
              role="progressbar"
              aria-label={messages.stats.focusProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              aria-valuetext={progressText}
              className="editorial-progress__ring"
              style={{ "--progress": `${percentage}%` } as React.CSSProperties}
            >
              <span>{formatNumber(percentage, locale)}%</span>
            </div>
            <div>
              <p className="editorial-kicker">{messages.stats.focusProgress}</p>
              <p className="mt-2 text-sm text-[#d0d0c9]">{progressText}</p>
              <p className="mt-1 text-xs leading-5 text-[#858983]">
                {locale === "th" ? "ค่อย ๆ ไปทีละอย่าง แล้วพื้นที่จะกลับมา" : "Small steps. Real progress."}
              </p>
            </div>
          </div>

          {task && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(task)}
              className="editorial-complete-button"
            >
              <Check aria-hidden="true" size={17} strokeWidth={2} />
              {messages.details.markComplete}
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
