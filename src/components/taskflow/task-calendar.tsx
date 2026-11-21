"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, formatNumber, formatTaskCount, interpolate, localeMetadata, type Locale, type TranslationMessages } from "@/i18n";
import { fromDateKey, toDateKey, formatClockTime, isValidDateKey } from "@/lib/date";
import { getCalendarDays, getCalendarKeyTarget, getCalendarTaskTiming, groupCalendarTasks } from "@/features/tasks/task-calendar";
import { courseInk } from "@/features/courses/course-stationery";
import { TASK_EVENT_TYPES, normalizeTaskEventType, type TaskEventType, type Task } from "@/types/task";

interface TaskCalendarProps {
  tasks: readonly Task[];
  now: Date;
  locale: Locale;
  messages: TranslationMessages;
  onOpen: (task: Task) => void;
}

export function TaskCalendar({ tasks, now, locale, messages, onOpen }: TaskCalendarProps) {
  const today = toDateKey(now);
  const [selection, setSelection] = useState<string | null>(null);
  const selectedDay = selection ?? today;
  const monthKey = selectedDay.slice(0, 7);
  const weeks = useMemo(() => {
    const days = getCalendarDays(monthKey);
    return Array.from({ length: days.length / 7 }, (_, week) => days.slice(week * 7, (week + 1) * 7));
  }, [monthKey]);
  const helpId = useId();
  const selectedButton = useRef<HTMLButtonElement>(null);
  const focusAfterNavigation = useRef(false);
  const [eventFilter, setEventFilter] = useState<TaskEventType | "all">("all");
  const filteredTasks = useMemo(() => tasks.filter((task) => eventFilter === "all" || normalizeTaskEventType(task.eventType) === eventFilter), [tasks, eventFilter]);
  const grouped = useMemo(() => groupCalendarTasks(filteredTasks), [filteredTasks]);
  const selectedTasks = grouped.get(selectedDay) ?? [];
  const copy = messages.calendar;
  const monthParts = useMemo(() => new Intl.DateTimeFormat(localeMetadata[locale].languageTag, {
    month: "long", year: "numeric",
  }).formatToParts(fromDateKey(`${monthKey}-01`)), [locale, monthKey]);
  const monthLabel = monthParts.map((part) => part.value).join("");
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const weekday = new Date(2026, 0, 4 + index); // January 4 is a Sunday.
    return {
      short: locale === "th" ? formatDate(weekday, locale, { weekday: "narrow" }) + "."
        : formatDate(weekday, locale, { weekday: "short" }),
      full: formatDate(weekday, locale, { weekday: "long" }),
    };
  }), [locale]);

  useLayoutEffect(() => {
    if (focusAfterNavigation.current) {
      focusAfterNavigation.current = false;
      selectedButton.current?.focus();
    }
  }, [selectedDay]);

  function handleDayKey(day: string, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = getCalendarKeyTarget(day, event.key, event.shiftKey);
    if (!target || !isValidDateKey(target)) return;
    event.preventDefault();
    if (target === selectedDay) {
      selectedButton.current?.focus();
      return;
    }
    focusAfterNavigation.current = true;
    setSelection(target);
  }

  function moveMonth(offset: number) {
    const date = fromDateKey(`${monthKey}-01`);
    date.setMonth(date.getMonth() + offset);
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

  function renderDay(day: string) {
    const events = grouped.get(day) ?? [];
    const selected = day === selectedDay;
    const label = [
      formatDate(day, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      formatTaskCount(events.length, locale),
      ...events.map((task) => `${messages.eventTypes[normalizeTaskEventType(task.eventType)]}: ${task.title}`),
    ].join(", ");

    return (
      <div role="gridcell" aria-selected={selected} key={day}>
        <button type="button" className="task-calendar__day"
          ref={selected ? selectedButton : undefined}
          tabIndex={selected ? 0 : -1}
          data-outside={!day.startsWith(monthKey) || undefined}
          data-today={day === today || undefined}
          aria-current={day === today ? "date" : undefined}
          aria-label={label}
          onKeyDown={(event) => handleDayKey(day, event)}
          onClick={() => setSelection(day)}
        >
          <span className="task-calendar__day-number">{formatNumber(Number(day.slice(-2)), locale)}</span>
          {events.slice(0, 3).map((task) => (
            <span key={task.id} className="task-calendar__day-note" data-course-ink={courseInk(task.category)} data-event-type={normalizeTaskEventType(task.eventType)} data-completed={task.completed || undefined} title={`${task.category} · ${messages.eventTypes[normalizeTaskEventType(task.eventType)]}: ${task.title}`}>
              <span className="event-type-dot" aria-hidden="true" /><span>{task.title}</span>
            </span>
          ))}
          {events.length > 3 && <span className="task-calendar__more">{interpolate(copy.moreEvents, { count: formatNumber(events.length - 3, locale) })}</span>}
        </button>
      </div>
    );
  }

  return (
    <section className="task-calendar" aria-labelledby="calendar-heading">
      <div className="task-calendar__heading">
        <h2 id="calendar-heading">
          <CalendarDays aria-hidden="true" />
          <span className="sr-only">{copy.title} · </span>
          <span aria-live="polite">{monthParts.map((part) => part.type === "year"
            ? <em key={part.type}>{part.value}</em> : part.value)}</span>
        </h2>
        <div className="task-calendar__navigation">
          <button type="button" className="task-calendar__today" onClick={() => setSelection(null)}>{messages.date.today}</button>
          <button type="button" aria-label={copy.previousMonth} onClick={() => moveMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" aria-label={copy.nextMonth} onClick={() => moveMonth(1)}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>

      <div className="task-calendar__legend" role="group" aria-label={messages.eventTypes.filter}>
        {(["all", ...TASK_EVENT_TYPES] as const).map((type) => (
          <button key={type} type="button" className="event-type-option" data-event-type={type} aria-pressed={eventFilter === type} onClick={() => setEventFilter(type)}>
            {type !== "all" && <span className="event-type-dot" aria-hidden="true" />}
            {messages.eventTypes[type]}
          </button>
        ))}
      </div>

      <p id={helpId} className="sr-only">{copy.keyboardHelp}</p>
      <div role="grid" aria-label={monthLabel} aria-describedby={helpId}>
        <div className="task-calendar__weekdays" role="row">
          {weekdayLabels.map(({ full, short }) => (
            <span key={full} role="columnheader" aria-label={full}>{short}</span>
          ))}
        </div>
        <div className="task-calendar__grid" role="rowgroup">
          {weeks.map((week) => (
            <div className="task-calendar__week" role="row" key={week[0]}>
              {week.map(renderDay)}
            </div>
          ))}
        </div>
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
