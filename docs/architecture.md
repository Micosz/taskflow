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

### Projects

The Projects section pairs an interactive force graph with the existing calendar.
Saved courses and name-only custom projects share the existing owner-scoped course
catalog (`courses` / `taskflow:v1:courses`); no new table or widget update is needed.
Create a custom project in Projects, then choose it under **Course / project** in
the task form. Existing task-only categories also appear automatically, including
categories whose saved preset was removed. An empty saved preset remains visible.

Membership uses a normalized category snapshot, matching the existing task model.
Renaming a saved preset does not move historical tasks: the old category remains
its own project until those tasks are edited. Deleting a preset never deletes tasks.
Projects are derived from the current account's repositories, with UI reset across
account scope changes; guest projects participate in the existing course migration.

Edges follow due date, due time (untimed last), creation time, then task ID, including
completed milestones. Changing dates, moving categories, adding or deleting tasks
rebuilds the sequence. Edges represent schedule order, not dependencies. The graph
supports pointer-captured node drag, canvas pan, cursor-centered wheel zoom, zoom
buttons and fit. Positions are temporary presentation state, not task mutations.
The damped simulation cools to rest, suspends in hidden tabs, cleans up on unmount,
and uses a static layout for reduced motion. Task nodes are keyboard accessible;
a chronological task list provides an alternative to the spatial graph.
