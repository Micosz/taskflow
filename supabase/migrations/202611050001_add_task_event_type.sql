-- Apply before deploying the calendar event-type UI. Existing clients remain compatible.
alter table public.tasks
  add column event_type text not null default 'task'
  constraint tasks_event_type_check
  check (event_type in ('task', 'study', 'activity', 'exam', 'important', 'holiday'));
