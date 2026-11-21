"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { BookOpen, CalendarDays, Pencil } from "lucide-react";
import { courseInk, courseTabLabel } from "@/features/courses/course-stationery";
import { parseQuickEntry, type QuickEntryDraft } from "@/features/tasks/quick-entry";
import { toCreateTaskInput, validateTaskForm } from "@/features/tasks/task-validation";
import { formatCompactDate } from "@/lib/date";
import { interpolate, type Locale, type TranslationMessages } from "@/i18n";
import type { CreateTaskInput } from "@/types/task";

interface QuickEntryProps {
  inputRef: RefObject<HTMLInputElement | null>;
  categories: readonly string[];
  now: Date;
  locale: Locale;
  messages: TranslationMessages;
  onReview: (draft: QuickEntryDraft) => void;
  onSave: (input: CreateTaskInput) => Promise<void>;
}

export function QuickEntry({ inputRef, categories, now, locale, messages, onReview, onSave }: QuickEntryProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"ready" | "saving" | "error">("ready");
  const pending = useRef(false);
  const id = useId();
  const draft = parseQuickEntry(text, categories, now);
  const copy = messages.notebook;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || pending.current) return;
    if (draft.dateConflict || draft.needsTimeReview || Object.keys(validateTaskForm(draft)).length) {
      onReview(draft);
      return;
    }
    pending.current = true;
    setStatus("saving");
    try {
      await onSave(toCreateTaskInput(draft));
      setText("");
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      pending.current = false;
    }
  }

  return (
    <form className="quick-entry" onSubmit={submit} aria-labelledby={id + "-heading"}>
      <header className="sheet-heading"><h2 id={id + "-heading"}><Pencil aria-hidden="true" /><label htmlFor={id}>{copy.quickTitle}</label></h2></header>
      <div className="quick-entry__line">
        <input ref={inputRef} id={id} type="text" autoComplete="off" disabled={status === "saving"} value={text}
          aria-describedby={draft.dateConflict ? id + "-date-conflict" : undefined}
          onChange={(event) => { setText(event.target.value); setStatus("ready"); }} placeholder={copy.example} />
        <button className="notebook-primary" type="submit" disabled={!text.trim() || status === "saving"}>
          {draft.dateConflict ? copy.reviewDate : messages.common.save}
        </button>
      </div>
      {text.trim() && <div className="quick-entry__preview" aria-live="polite">
        <button type="button" disabled={status === "saving"} onClick={() => onReview(draft)} title={copy.review} data-course-ink={courseInk(draft.category)}>
          <BookOpen size={15} aria-hidden="true" />{draft.category ? courseTabLabel(draft.category) : copy.chooseCourse}
        </button>
        <button type="button" disabled={status === "saving"} onClick={() => onReview(draft)} title={copy.review}>
          <CalendarDays size={15} aria-hidden="true" />{draft.dueDate ? formatCompactDate(draft.dueDate, locale) : copy.chooseDate}{draft.dueTime && " · " + draft.dueTime}{draft.needsTimeReview && " · " + copy.chooseTime}
        </button>
        {draft.dateConflict && <p id={id + "-date-conflict"} className="basis-full text-sm">
          {interpolate(copy.dateConflict, draft.dateConflict)}
        </p>}
      </div>}
      {status === "error" && <p role="alert" className="quick-entry__error">{messages.toast.errorDescription}</p>}
    </form>
  );
}
