# Architecture

The interactive UI depends on small task, course and Todo repository contracts rather than a storage vendor. Auth state selects local or Supabase implementations; components use the same CRUD and subscription interfaces in both modes.

```text
src/
  app/                   Routes, metadata, global styles and manifest
  components/taskflow/   Task dashboard, Todo, navigation and dialogs
  features/              Auth, tasks, courses and Todo state
  data/                  Repository contracts, storage adapters and migrations
  i18n/                  Typed English/Thai translations
  lib/                   Date helpers and typed Supabase browser client
  types/                 Task, course and Todo domain models
```


The runtime flow is session-aware:

```text
Signed out → TaskFlow UI → TaskRepository → LocalTaskRepository → localStorage
Signed in  → TaskFlow UI → TaskRepository → SupabaseTaskRepository → PostgreSQL
                                                              ↕ private Realtime Broadcast

Signed out → Course UI → CourseRepository → LocalCourseRepository → localStorage
Signed in  → Course UI → CourseRepository → SupabaseCourseRepository → PostgreSQL
                                                            ↕ private Realtime Broadcast
```

Each repository receives a unique scope key (`local` or `cloud:<user-id>`). Changing scope immediately clears visible task and course snapshots and ignores late responses from the previous scope, preventing one account's data from appearing for another.

## Saved Courses data model

Saved Courses are reusable presets, while `tasks.category` remains the authoritative text snapshot stored on each task. A course can contain a code, a name, or both; compact labels use `CODE — Name` when both are present. This preserves every existing task and keeps custom categories fully compatible.

- Selecting a Saved Course copies its current display label into the task category.
- Selecting **Other…** accepts arbitrary text for that task only and never creates a course.
- Renaming a Saved Course changes future selections; existing tasks retain their original snapshot until the user explicitly edits and saves that task with the renamed course.
- Deleting a Saved Course removes only the reusable preset. It never deletes, clears, or cascades to tasks.
- Search continues to match the category snapshot, so codes such as `CS361` remain searchable.

## Language support

Every interface string is centralized and shape-checked in `src/i18n/translations.ts`. Users can switch between English and Thai from the header or Settings; the choice is stored under `taskflow.locale`, and the document language updates for assistive technology. English is the default. User-authored task content is preserved as entered rather than translated.

The preference boundary is intentionally local today and can later be backed by a user profile without changing the translation catalog.

## Undated Todo

The separate **Todo** menu stores reminders without a due date or time. Add, edit,
complete, reopen, search, and delete items independently of scheduled tasks and calendars.
Guest items stay on this device under a separate storage key. Signed-in items use the
private `todos` table and owner-authorized Realtime channels.

Apply `supabase/migrations/202610140001_create_todos.sql` before enabling cloud Todo.
Moving guest Todo into an account requires an explicit import; retries are idempotent,
and source items are cleared only after verification. Guest edits made during import remain.
