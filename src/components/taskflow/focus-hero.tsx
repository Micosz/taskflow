"use client";

import { BookOpen, CalendarDays, Check, Target } from "lucide-react";
import { formatDate, interpolate, type Locale, type TranslationMessages } from "@/i18n";
import { formatClockTime, formatCompactDate } from "@/lib/date";
import { courseTabLabel } from "@/features/courses/course-stationery";
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

export function FocusHero({ task, now, locale, messages, busy, onOpen, onToggle }: FocusHeroProps) {
  const toggleLabel = task ? interpolate(task.completed ? messages.task.markIncomplete : messages.task.markComplete, { title: task.title }) : "";
  return (
    <section className="notebook-focus" aria-labelledby="focus-heading">
      <header className="sheet-heading">
        <h2 id="focus-heading"><Target aria-hidden="true" />{messages.notebook.focus}</h2>
        {task && <button type="button" className="sheet-icon focus-toggle" disabled={busy} onClick={() => onToggle(task)} aria-label={toggleLabel} title={toggleLabel}><Check size={16} aria-hidden="true" /></button>}
      </header>
      <p className="notebook-focus__date">{formatDate(now, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      {task ? <>
        <button type="button" className="notebook-focus__title" onClick={() => onOpen(task)} aria-label={interpolate(messages.task.openDetails, { title: task.title })}><span>{task.title}</span></button>
        <div className="notebook-focus__facts">
          <TaskCountdown compact task={task} locale={locale} messages={messages} />
          <p title={task.category}><BookOpen aria-hidden="true" />{courseTabLabel(task.category)}</p>
          <p><CalendarDays aria-hidden="true" /><time dateTime={task.dueDate + (task.dueTime ? "T" + task.dueTime : "")}>{formatCompactDate(task.dueDate, locale)} · {task.dueTime ? formatClockTime(task.dueTime, locale) : messages.task.noDueTime}</time></p>
        </div>
      </> : <p className="notebook-focus__empty">{messages.notebook.emptyFocus}</p>}
    </section>
  );
}
