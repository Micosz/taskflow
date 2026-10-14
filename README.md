# TaskFlow

A polished, local-first task manager designed for focused work across desktop and mobile.

## What is TaskFlow?

TaskFlow is a bilingual productivity web app for turning coursework, projects, and everyday responsibilities into a clear plan. It remains fully usable without an account, while optional Supabase email/password authentication unlocks private cloud storage and realtime cross-device synchronization.

## Main features

- Create, edit, delete, complete, and reopen tasks.
- Track a title, notes, course or category, due date, and optional due time.
- Save reusable university courses with an optional code and name, then select them in task forms.
- Use **Other…** for a one-off task category without adding it to Saved Courses.
- Land on every unfinished task, then switch to Today, Upcoming, Overdue, or Completed filters.
- Search across task titles, notes, and categories, with live counts and progress summaries.
- Keep tasks and language preferences across refreshes with `localStorage`; changes also propagate between tabs on the same origin.
- Preserve local task data behind the versioned `taskflow:v1:tasks` key, including an automatic migration from the earlier V1 key.
- Preserve guest Saved Courses under the independent versioned `taskflow:v1:courses` key.
- Sign up, sign in, restore sessions, and sign out with Supabase Auth without making accounts mandatory.
- Switch automatically between private guest storage and a user-scoped Supabase repository.
- Explicitly move local tasks to the cloud with retry-safe duplicate protection and no silent deletion.
- Receive cloud inserts, updates, completions, and deletions in other signed-in sessions through private Realtime channels.
- Use a responsive desktop sidebar, mobile bottom navigation, touch-friendly sheets, safe-area spacing, and accessible dialogs.
- Enjoy lightweight Motion animations, completion feedback, loading and empty states, keyboard focus management, and reduced-motion support.
- Restore the relative-date sample workspace from Settings when needed.

## Tech stack

- [Next.js 16](https://nextjs.org/) App Router and React 19
- TypeScript with strict type checking
- Tailwind CSS 4 with custom CSS design tokens and responsive styles
- [Motion](https://motion.dev/) for transitions and micro-interactions
- [Lucide React](https://lucide.dev/) for interface icons
- `@supabase/supabase-js` for the prepared cloud repository and Realtime client
- Vitest for fast unit coverage of task rules, local persistence, and translations
- Native browser APIs and `Intl` for local persistence and localized dates

## Local development

Use a current Node.js LTS release and npm. Supabase environment variables are optional for the local-first app.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Before sharing changes, run the available quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

To run the production build locally:

```bash
npm start
```

## Project architecture

The interactive UI depends on small `TaskRepository` and `CourseRepository` contracts rather than a storage vendor. Auth state selects local or Supabase implementations; components use the same CRUD and subscription interfaces in both modes.

```text
app/                    Route shell, metadata, global styles, and manifest
components/taskflow/    Dashboard, navigation, task cards, forms, and dialogs
features/tasks/         Task state hook, selectors, sorting, and validation
features/courses/       Course state, task-option mapping, and scope isolation
features/auth/          Supabase session lifecycle and localized auth errors
data/                   Task/course contracts, local adapters, migration, Supabase adapters
i18n/                   Typed English/Thai messages and locale utilities
lib/                    Date helpers and typed Supabase browser client
public/icons/           Standard, maskable, and Apple application icons
supabase/migrations/    PostgreSQL schema, RLS, migration idempotency, and Realtime
tests/                  Filters, repository scopes, migration, persistence, and i18n tests
types/                  Shared task and course domain types
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

Every interface string is centralized and shape-checked in `i18n/translations.ts`. Users can switch between English and Thai from the header or Settings; the choice is stored under `taskflow.locale`, and the document language updates for assistive technology. English is the default. User-authored task content is preserved as entered rather than translated.

The preference boundary is intentionally local today and can later be backed by a user profile without changing the translation catalog.

## Supabase setup

Supabase cloud mode is active whenever valid public configuration is available and the user signs in. Missing or invalid configuration does not break guest mode.

To prepare a Supabase project:

1. Create a project and enable email/password authentication.
2. Copy `.env.example` to `.env.local` and add the project URL plus a publishable key.
3. Apply every file in `supabase/migrations/` in filename order. The second migration adds task-import idempotency; `202609040002_create_courses.sql` adds private Saved Courses storage and Realtime support.
4. In Supabase Realtime settings, disable **Allow public access** so private channels must pass authorization.
5. In Auth URL Configuration, add the local and deployed TaskFlow URLs to the allowed redirect URLs and set the production Site URL.
6. Configure email confirmation according to the sign-up behavior you want.

The app verifies restored users with `auth.getUser()`, listens for auth state changes, and subscribes signed-in users to `taskflow:tasks:<user-id>`. No service-role key belongs in this browser application.

## Environment variables

The template is committed as `.env.example`; real `.env` files are ignored by Git.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Optional fallback for older projects; leave empty when the publishable key is set.
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a legacy fallback. These public browser keys are safe only when Row Level Security remains enabled and correctly configured. Restart the development server after changing `.env.local`.

For Vercel, add the same two public variables under **Project Settings → Environment Variables** for each required environment, then redeploy. Never add a service-role or secret key to a `NEXT_PUBLIC_` variable.

## Authentication and storage behavior

- **Guest:** TaskFlow uses `LocalTaskRepository` and `LocalCourseRepository`; tasks and Saved Courses remain in that browser's `localStorage`.
- **Signed in:** TaskFlow uses the Supabase task and course repositories; RLS associates and returns only the authenticated user's rows.
- **Session restore:** Supabase persists and refreshes the browser session. TaskFlow verifies the restored user before selecting cloud storage.
- **Sign out/user change:** the current task snapshot is cleared before the next repository loads, and the previous Realtime subscription is removed.

To create a test account, use **Settings → Account → Sign in**, switch to **Create account**, and submit an email/password. If email confirmation is enabled, follow the emailed link before signing in. Existing Supabase dashboard users can sign in directly.

## Local-to-cloud migration

After sign-in, TaskFlow checks for actual local persisted tasks and Saved Courses. If either exists, one coherent dialog offers three explicit choices: move the local workspace to cloud, keep it on the device, or decide later.

Migration imports and verifies both data sets before clearing local storage. Task retries use the unique `(user_id, migration_key)` constraint; courses use the case-insensitive `(user_id, dedupe_key)` constraint. If a cloud import fails, neither local source is cleared. If local clearing fails, TaskFlow restores both snapshots on a best-effort basis so the migration remains safely retryable.

An identical course already present in the cloud is treated as safely migrated. If the same normalized code exists with different course details, migration stops and keeps the local workspace intact instead of silently overwriting either version.

Choosing **Keep on this device** remembers the task-set fingerprint for that account. If local tasks later change, TaskFlow offers migration again.

## Realtime synchronization

Authenticated repositories subscribe to private task and course Broadcast topics per user. INSERT, UPDATE, and DELETE events trigger a scoped refetch, replacing the relevant snapshot rather than appending events. This simple strategy prevents duplicate cards/options and relies on RLS plus Realtime Authorization for isolation.

To test sync, run the deployed app or local app in two independent browser profiles, sign into the same account in both, then create, complete, edit, and delete tasks in either session. Each change should appear in the other session without refreshing. Private Realtime channels require **Allow public access** to be disabled in Supabase Realtime settings.

## Database setup

The checked-in migration creates:

- A legacy `task_priority` enum and multi-user `tasks` table with UUID ownership. The column remains for backwards compatibility but is no longer part of the product experience.
- Constraints for title, description, category, dates, and timestamps.
- Owner/status/due-date indexes and automatic `updated_at` maintenance.
- RLS policies allowing authenticated users to select, insert, update, and delete only their own tasks.
- A trigger that emits inserts, updates, and deletes through a private per-user Realtime Broadcast topic.
- A `realtime.messages` policy that authorizes a user only for the topic matching `auth.uid()`.
- A nullable migration key with a per-user unique constraint for duplicate-safe local imports.
- A multi-user `courses` table whose code and name are independent from historical task snapshots.
- A generated case-insensitive course dedupe key and owner-scoped uniqueness constraint.
- Course CRUD RLS policies, an owner/update index, timestamp trigger, and private per-user Realtime broadcasts.

Apply the migration either in the Supabase SQL Editor or with the Supabase CLI after linking the project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The generated-style TypeScript database contract is in `lib/supabase/database.types.ts`. Regenerate it after future schema changes. Normal task and course creation omit `user_id` and let PostgreSQL default it from `auth.uid()`; migration ownership also remains protected by each INSERT `WITH CHECK` policy.

## PWA / iPhone usage

TaskFlow includes an App Router manifest, standalone display metadata, dark theme and status-bar settings, Apple and maskable icons, dynamic viewport sizing, touch-friendly controls, and iPhone safe-area handling.

After deploying over HTTPS, open TaskFlow in iPhone Safari, tap **Share**, choose **Add to Home Screen**, and launch it from the new icon. The responsive layout preserves the app-like experience with mobile navigation and sheet-style forms, while Settings reports when TaskFlow is running in standalone mode.

There is currently no service worker, offline asset cache, background sync, or push notification support. The manifest and installed-app experience are groundwork for a fuller PWA; a network connection is still required to load or refresh the deployed application.

## V1 scope

V1 includes the complete local task workflow, reusable Saved Courses, email/password accounts, session-aware cloud storage, explicit local migration, private realtime synchronization, realistic seeded data, filters, search, progress summaries, English/Thai switching, responsive layouts, accessible interaction patterns, animation, local persistence, and PWA metadata.

Google OAuth, password-reset UI, collaboration, recurring tasks, attachments, calendar integrations, analytics, AI features, push notifications, and guaranteed offline loading remain out of scope.

## Undated Todo

The separate **Todo** menu stores reminders without a due date or time. Add, edit,
complete, reopen, search, and delete items independently of scheduled tasks and calendars.
Guest items stay on this device under a separate storage key. Signed-in items use the
private `todos` table and owner-authorized Realtime channels.

Apply `supabase/migrations/202610140001_create_todos.sql` before enabling cloud Todo.
Moving guest Todo into an account requires an explicit import; retries are idempotent,
and source items are cleared only after verification. Guest edits made during import remain.

## KDE desktop widget

TaskFlow also includes an optional Plasma 6 desktop/panel widget for Fedora KDE.
It shows unfinished tasks, deadline countdowns, and today's task count, supports
completion from the desktop, and sends reminders one hour before deadlines.
A Python standard-library companion starts with your graphical session and polls
Supabase every 30 seconds; no browser window or Next.js server needs to stay open.

```bash
python3 desktop/kde-widget/install.py --web-url https://taskflow-ruddy-one.vercel.app/
```

Add **TaskFlow** or **TaskFlow Calendar** from KDE's **Add Widgets** menu and sign in with your existing account.
The calendar uses a solid background and shows unfinished scheduled tasks by date,
with notes and deadline times for the selected day. Both widgets share one companion
and session; undated Todo remains in the website's separate menu.
Guest tasks must first be moved to cloud through the website. Local private files store
this widget's session and last fetched tasks; the widget does not store your password.

See [desktop/kde-widget/README.md](desktop/kde-widget/README.md) for installation,
privacy boundaries, offline behavior, testing, notifications, and uninstall instructions.

## Future roadmap

1. Add password reset/change flows and optional OAuth providers.
2. Add Supabase-backed integration tests and browser-level auth/sync coverage.
3. Introduce a deliberate service-worker/offline strategy before considering background sync or push notifications.
4. Evaluate recurring tasks and calendar views only after the focused personal workflow is stable.

## Known limitations

- Cloud mode requires network access; there is no offline mutation queue or conflict-resolution engine.
- Realtime uses a full scoped refetch per database event, favoring correctness and simplicity over maximum efficiency.
- Email delivery and confirmation behavior depend on the Supabase Auth settings and SMTP limits of the project.
- The new `202609040001_add_task_migration_key.sql` migration must be applied before local-to-cloud migration can succeed.
- The new `202609040002_create_courses.sql` migration must be applied before cloud Saved Courses, course migration, or course Realtime can work.
