# TaskFlow

A polished, local-first task manager designed for focused work across desktop and mobile.

## What is TaskFlow?

TaskFlow is a bilingual productivity web app for turning coursework, projects, and everyday responsibilities into a clear plan. It remains fully usable without an account, while optional Supabase email/password authentication unlocks private cloud storage and realtime cross-device synchronization.

## Main features

- Create, edit, delete, complete, and reopen tasks.
- Track a title, notes, course or category, priority, due date, and optional due time.
- Switch between Today, Upcoming, Overdue, Completed, and All Tasks views.
- Search across task titles, notes, and categories, with live counts and progress summaries.
- Keep tasks and language preferences across refreshes with `localStorage`; changes also propagate between tabs on the same origin.
- Preserve local task data behind the versioned `taskflow:v1:tasks` key, including an automatic migration from the earlier V1 key.
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

The interactive UI depends on a small `TaskRepository` contract rather than a storage vendor. Auth state selects the local or Supabase implementation; task components use the same CRUD and subscription interface in both modes.

```text
app/                    Route shell, metadata, global styles, and manifest
components/taskflow/    Dashboard, navigation, task cards, forms, and dialogs
features/tasks/         Task state hook, selectors, sorting, and validation
features/auth/          Supabase session lifecycle and localized auth errors
data/                   Repository contract, local adapter, samples, Supabase adapter
i18n/                   Typed English/Thai messages and locale utilities
lib/                    Date helpers and typed Supabase browser client
public/icons/           Standard, maskable, and Apple application icons
supabase/migrations/    PostgreSQL schema, RLS, migration idempotency, and Realtime
tests/                  Filters, repository scopes, migration, persistence, and i18n tests
types/                  Shared task domain types
```

The runtime flow is session-aware:

```text
Signed out → TaskFlow UI → TaskRepository → LocalTaskRepository → localStorage
Signed in  → TaskFlow UI → TaskRepository → SupabaseTaskRepository → PostgreSQL
                                                              ↕ private Realtime Broadcast
```

Each repository receives a unique scope key (`local` or `cloud:<user-id>`). Changing scope immediately clears the visible task snapshot and ignores late responses from the previous scope, preventing one account's tasks from appearing for another.

## Language support

Every interface string is centralized and shape-checked in `i18n/translations.ts`. Users can switch between English and Thai from the header or Settings; the choice is stored under `taskflow.locale`, and the document language updates for assistive technology. English is the default. User-authored task content is preserved as entered rather than translated.

The preference boundary is intentionally local today and can later be backed by a user profile without changing the translation catalog.

## Supabase setup

Supabase cloud mode is active whenever valid public configuration is available and the user signs in. Missing or invalid configuration does not break guest mode.

To prepare a Supabase project:

1. Create a project and enable email/password authentication.
2. Copy `.env.example` to `.env.local` and add the project URL plus a publishable key.
3. Apply both files in `supabase/migrations/` in filename order. The second migration adds the idempotency key required for retry-safe local imports.
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

- **Guest:** TaskFlow uses `LocalTaskRepository`; tasks remain in that browser's `localStorage`.
- **Signed in:** TaskFlow uses `SupabaseTaskRepository`; RLS associates and returns only the authenticated user's rows.
- **Session restore:** Supabase persists and refreshes the browser session. TaskFlow verifies the restored user before selecting cloud storage.
- **Sign out/user change:** the current task snapshot is cleared before the next repository loads, and the previous Realtime subscription is removed.

To create a test account, use **Settings → Account → Sign in**, switch to **Create account**, and submit an email/password. If email confirmation is enabled, follow the emailed link before signing in. Existing Supabase dashboard users can sign in directly.

## Local-to-cloud migration

After sign-in, TaskFlow checks for actual local persisted tasks without creating new sample data. If tasks are found, it offers three explicit choices: move them to cloud, keep them on the device, or decide later.

Migration performs one batch cloud upsert and verifies every source key before clearing local storage. The unique `(user_id, migration_key)` constraint makes retries idempotent. A failed cloud write or failed local clear leaves the local records available; TaskFlow never silently moves or deletes them.

Choosing **Keep on this device** remembers the task-set fingerprint for that account. If local tasks later change, TaskFlow offers migration again.

## Realtime synchronization

Authenticated repositories subscribe to one private Broadcast topic per user. INSERT, UPDATE, and DELETE events trigger a scoped task refetch, replacing the snapshot rather than appending events. This simple strategy handles optimistic local changes without duplicate cards and relies on RLS plus Realtime Authorization for isolation.

To test sync, run the deployed app or local app in two independent browser profiles, sign into the same account in both, then create, complete, edit, and delete tasks in either session. Each change should appear in the other session without refreshing. Private Realtime channels require **Allow public access** to be disabled in Supabase Realtime settings.

## Database setup

The checked-in migration creates:

- A `task_priority` enum and multi-user `tasks` table with UUID ownership.
- Constraints for title, description, category, priority, dates, and timestamps.
- Owner/status/due-date indexes and automatic `updated_at` maintenance.
- RLS policies allowing authenticated users to select, insert, update, and delete only their own tasks.
- A trigger that emits inserts, updates, and deletes through a private per-user Realtime Broadcast topic.
- A `realtime.messages` policy that authorizes a user only for the topic matching `auth.uid()`.
- A nullable migration key with a per-user unique constraint for duplicate-safe local imports.

Apply the migration either in the Supabase SQL Editor or with the Supabase CLI after linking the project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The generated-style TypeScript database contract is in `lib/supabase/database.types.ts`. Regenerate it after future schema changes. Normal task creation omits `user_id` and lets PostgreSQL default it from `auth.uid()`; migration ownership also remains protected by the INSERT `WITH CHECK` policy.

## PWA / iPhone usage

TaskFlow includes an App Router manifest, standalone display metadata, dark theme and status-bar settings, Apple and maskable icons, dynamic viewport sizing, touch-friendly controls, and iPhone safe-area handling.

After deploying over HTTPS, open TaskFlow in iPhone Safari, tap **Share**, choose **Add to Home Screen**, and launch it from the new icon. The responsive layout preserves the app-like experience with mobile navigation and sheet-style forms, while Settings reports when TaskFlow is running in standalone mode.

There is currently no service worker, offline asset cache, background sync, or push notification support. The manifest and installed-app experience are groundwork for a fuller PWA; a network connection is still required to load or refresh the deployed application.

## V1 scope

V1 includes the complete local task workflow, email/password accounts, session-aware cloud storage, explicit local migration, private realtime synchronization, realistic seeded data, filters, search, progress summaries, English/Thai switching, responsive layouts, accessible interaction patterns, animation, local persistence, and PWA metadata.

Google OAuth, password-reset UI, collaboration, recurring tasks, attachments, calendar integrations, analytics, AI features, push notifications, and guaranteed offline loading remain out of scope.

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
