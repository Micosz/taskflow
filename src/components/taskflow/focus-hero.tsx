"use client";

import { ArrowUpRight, BookOpen, CalendarDays, Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
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
  busy: boolean;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
}

export function FocusHero({
  task,
  now,
  locale,
  messages,
  busy,
  onOpen,
  onToggle,
}: FocusHeroProps) {
  const reduceMotion = useReducedMotion();
  const greeting = messages.greeting[getGreetingPeriod(now)];
  const hasExpandableDescription = Boolean(
    task?.description &&
      (task.description.length > 180 || task.description.split(/\r?\n/).length > 4),
  );

  return (
    <motion.section
      aria-label={messages.details.title}
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

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={task?.id ?? "empty-focus"}
            className="editorial-focus__task"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
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
                  <div
                    className="editorial-focus__description-wrap"
                    data-expandable={hasExpandableDescription || undefined}
                  >
                    <p className="editorial-focus__description">{task.description}</p>
                    {hasExpandableDescription && (
                      <button
                        type="button"
                        className="editorial-focus__details-link"
                        onClick={() => onOpen(task)}
                      >
                        {messages.details.viewFull}
                        <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
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
          </motion.div>
        </AnimatePresence>

        {task && (
          <div className="editorial-focus__footer">
            <button
              type="button"
              disabled={busy}
              onClick={() => onToggle(task)}
              className="editorial-complete-button"
            >
              <Check aria-hidden="true" size={17} strokeWidth={2} />
              {messages.details.markComplete}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}
