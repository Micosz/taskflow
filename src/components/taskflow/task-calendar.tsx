"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatNumber, formatTaskCount, interpolate, type Locale, type TranslationMessages } from "@/i18n";
import { fromDateKey, toDateKey, formatClockTime } from "@/lib/date";
import { getCalendarDays, getCalendarTaskTiming, getNextCalendarTask, groupCalendarTasks } from "@/features/tasks/task-calendar";
import { TASK_EVENT_TYPES, normalizeTaskEventType, type TaskEventType, type Task } from "@/types/task";

interface TaskCalendarProps {
  tasks: Task[];
  now: Date;
  locale: Locale;
  messages: TranslationMessages;
  onOpen: (task: Task) => void;
}

export function TaskCalendar({ tasks, now, locale, messages, onOpen }: TaskCalendarProps) {
  const today = toDateKey(now);
  const [selection, setSelection] = useState<string | null>(null);
  const selectedDay = selection ?? today;
  const [month, setMonth] = useState<string | null>(null);
  const monthKey = month ?? today.slice(0, 7);
  const days = useMemo(() => getCalendarDays(monthKey), [monthKey]);
  const [eventFilter, setEventFilter] = useState<TaskEventType | "all">("all");
  const filteredTasks = useMemo(() => tasks.filter((task) => eventFilter === "all" || normalizeTaskEventType(task.eventType) === eventFilter), [tasks, eventFilter]);
  const grouped = useMemo(() => groupCalendarTasks(filteredTasks), [filteredTasks]);
  const selectedTasks = grouped.get(selectedDay) ?? [];
  const nextTask = getNextCalendarTask(filteredTasks, now);
  const copy = messages.calendar;
  const monthLabel = formatDate(`${monthKey}-01`, locale, { month: "long", year: "numeric" });

  function moveMonth(offset: number) {
    const date = fromDateKey(`${monthKey}-01`);
    date.setMonth(date.getMonth() + offset);
    setMonth(toDateKey(date).slice(0, 7));
    setSelection(toDateKey(date));
  }

  function timingLabel(task: Task) {
    const { days, status } = getCalendarTaskTiming(task, now);
    if (status === "completed") return messages.task.completed;
    if (status === "overdue") return days === 0 ? messages.task.overdue
      : interpolate(messages.task.overdueBy, { count: formatNumber(Math.abs(days), locale) });
    if (status === "today") return messages.task.dueToday;
    return interpolate(days === 1 ? copy.oneDayLeft : copy.daysLeft, { count: formatNumber(days, locale) });
  }

  return (
    <section className="task-calendar" aria-labelledby="calendar-heading">
      <div className="task-calendar__heading">
        <div>
          <h2 id="calendar-heading"><CalendarDays size={18} aria-hidden="true" />{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" className="task-calendar__today" onClick={() => { setMonth(null); setSelection(null); }}>{messages.date.today}</button>
      </div>

      <div className="task-calendar__legend" role="group" aria-label={messages.eventTypes.filter}>
        {(["all", ...TASK_EVENT_TYPES] as const).map((type) => (
          <button key={type} type="button" className="event-type-option" data-event-type={type} aria-pressed={eventFilter === type} onClick={() => setEventFilter(type)}>
            {type !== "all" && <span className="event-type-dot" aria-hidden="true" />}
            {messages.eventTypes[type]}
          </button>
        ))}
      </div>

      {nextTask && (
        <button type="button" className="task-calendar__next" data-event-type={normalizeTaskEventType(nextTask.eventType)} onClick={() => {
          setMonth(nextTask.dueDate.slice(0, 7));
          setSelection(nextTask.dueDate);
        }}>
          <span><span className="task-calendar__eyebrow">{copy.nextEvent} · {messages.eventTypes[normalizeTaskEventType(nextTask.eventType)]}</span><strong>{nextTask.title}</strong></span>
          <span className="task-calendar__countdown">{timingLabel(nextTask)}<ArrowUpRight size={14} aria-hidden="true" /></span>
        </button>
      )}

      <div className="task-calendar__navigation">
        <h3 aria-live="polite">{monthLabel}</h3>
        <div className="flex gap-1">
          <button type="button" aria-label={copy.previousMonth} onClick={() => moveMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" aria-label={copy.nextMonth} onClick={() => moveMonth(1)}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="task-calendar__weekdays" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => <span key={index}>{formatDate(new Date(2026, 0, 5 + index), locale, { weekday: "short" })}</span>)}
      </div>
      <div className="task-calendar__grid" role="group" aria-label={monthLabel}>
        {days.map((day) => {
          const events = grouped.get(day) ?? [];
          const first = events[0];
          return (
            <button
              key={day}
              type="button"
              className="task-calendar__day"
              data-outside={!day.startsWith(monthKey) || undefined}
              data-today={day === today || undefined}
              aria-current={day === today ? "date" : undefined}
              aria-pressed={day === selectedDay}
              aria-label={`${formatDate(day, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${formatTaskCount(events.length, locale)}${first ? `, ${events.map((task) => `${messages.eventTypes[normalizeTaskEventType(task.eventType)]}: ${task.title}`).join(", ")}` : ""}`}
              onClick={() => { setSelection(day); setMonth(day.slice(0, 7)); }}
            >
              <span className="task-calendar__day-number">{formatNumber(Number(day.slice(-2)), locale)}</span>
              {events.slice(0, 3).map((task) => (
                <span key={task.id} className="task-calendar__day-note" data-event-type={normalizeTaskEventType(task.eventType)} data-completed={task.completed || undefined} title={`${messages.eventTypes[normalizeTaskEventType(task.eventType)]}: ${task.title}`}>
                  <span className="event-type-dot" aria-hidden="true" /><span>{task.title}</span>
                </span>
              ))}
              {events.length > 3 && <span className="task-calendar__more">{interpolate(copy.moreEvents, { count: formatNumber(events.length - 3, locale) })}</span>}
            </button>
          );
        })}
      </div>

      <div className="task-calendar__notes" aria-live="polite">
        <div className="task-calendar__notes-heading"><h3>{formatDate(selectedDay, locale, { weekday: "long", day: "numeric", month: "long" })}</h3><span>{formatTaskCount(selectedTasks.length, locale)}</span></div>
        {selectedTasks.length === 0 ? <p className="task-calendar__empty">{copy.emptyDay}</p> : (
          <ul className="task-calendar__note-list">
            {selectedTasks.map((task) => (
              <li key={task.id}>
                <button type="button" className="task-calendar__note" data-event-type={normalizeTaskEventType(task.eventType)} onClick={() => onOpen(task)} aria-label={interpolate(messages.task.openDetails, { title: task.title })}>
                  <span className="task-calendar__note-top"><strong className={task.completed ? "line-through opacity-60" : ""}>{task.title}</strong><span className="task-calendar__status" data-status={getCalendarTaskTiming(task, now).status}>{timingLabel(task)}</span></span>
                  <span className="event-type-badge"><span className="event-type-dot" aria-hidden="true" />{messages.eventTypes[normalizeTaskEventType(task.eventType)]}</span>
                  <span className="task-calendar__note-meta">{task.category} · {task.dueTime ? formatClockTime(task.dueTime, locale) : messages.task.noDueTime}</span>
                  {task.description && <span className="task-calendar__description">{task.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
