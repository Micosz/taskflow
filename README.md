# TaskFlow

A polished, local-first task manager designed for focused work across desktop and mobile.

## What is TaskFlow?

TaskFlow is a bilingual productivity web app for turning coursework, projects, and everyday responsibilities into a clear plan. The current V1 is fully usable without an account: it starts with date-aware sample tasks, supports complete client-side task management, and saves changes in the browser. Its repository boundary, database migration, and typed Supabase adapter prepare the app for authenticated cross-device sync without making cloud credentials a requirement today.

## Main features

- Create, edit, delete, complete, and reopen tasks.
- Track a title, notes, course or category, priority, due date, and optional due time.
- Switch between Today, Upcoming, Overdue, Completed, and All Tasks views.
- Search across task titles, notes, and categories, with live counts and progress summaries.
- Keep tasks and language preferences across refreshes with `localStorage`; changes also propagate between tabs on the same origin.
- Preserve local task data behind the versioned `taskflow:v1:tasks` key, including an automatic migration from the earlier V1 key.
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

The interactive UI depends on a small `TaskRepository` contract rather than a storage vendor. V1 uses the local implementation; the prepared Supabase implementation follows the same CRUD and subscription interface.

```text
app/                    Route shell, metadata, global styles, and manifest
components/taskflow/    Dashboard, navigation, task cards, forms, and dialogs
features/tasks/         Task state hook, selectors, sorting, and validation
data/                   Repository contract, local adapter, samples, Supabase adapter
i18n/                   Typed English/Thai messages and locale utilities
lib/                    Date helpers and typed Supabase browser client
public/icons/           Standard, maskable, and Apple application icons
supabase/migrations/    PostgreSQL schema, RLS, indexes, and Realtime Broadcast
tests/                  Filters, local repository, migration, and i18n unit tests
types/                  Shared task domain types
```

The current runtime flow is:

```text
TaskFlow UI → TaskRepository → LocalTaskRepository → browser localStorage
```

After authentication is connected, the adapter can be selected without rewriting task components:

```text
TaskFlow UI → TaskRepository → SupabaseTaskRepository → PostgreSQL + private Broadcast
```

## Language support

Every interface string is centralized and shape-checked in `i18n/translations.ts`. Users can switch between English and Thai from the header or Settings; the choice is stored under `taskflow.locale`, and the document language updates for assistive technology. English is the default. User-authored task content is preserved as entered rather than translated.

The preference boundary is intentionally local today and can later be backed by a user profile without changing the translation catalog.

## Supabase setup

Supabase support is prepared but **not active in V1**. The app still uses `LocalTaskRepository`, and there is no connected sign-in or account screen. Do not expect tasks to sync between devices until authentication and repository selection are wired.

To prepare a Supabase project:

1. Create a project and enable the authentication provider you intend to use.
2. Copy `.env.example` to `.env.local` and add the project URL plus a publishable key.
3. Apply `supabase/migrations/202609030001_create_tasks.sql` to a fresh project.
4. In Supabase Realtime settings, disable **Allow public access** so private channels must pass authorization.
5. Add the sign-in/session UI, verify the user with Supabase Auth, then construct `createAuthenticatedSupabaseTaskRepository()` and provide it to the task state layer.

The prepared adapter verifies the authenticated user, relies on RLS for ownership, and subscribes to the private topic `taskflow:tasks:<user-id>`. No service-role key belongs in this browser application.

## Environment variables

The template is committed as `.env.example`; real `.env` files are ignored by Git.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Optional fallback for older projects; leave empty when the publishable key is set.
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is supported only as a legacy fallback. These public browser keys are safe only when Row Level Security remains enabled and correctly configured. Restart the development server after changing `.env.local`.

## Database setup

The checked-in migration creates:

- A `task_priority` enum and multi-user `tasks` table with UUID ownership.
- Constraints for title, description, category, priority, dates, and timestamps.
- Owner/status/due-date indexes and automatic `updated_at` maintenance.
- RLS policies allowing authenticated users to select, insert, update, and delete only their own tasks.
- A trigger that emits inserts, updates, and deletes through a private per-user Realtime Broadcast topic.
- A `realtime.messages` policy that authorizes a user only for the topic matching `auth.uid()`.

Apply the migration either in the Supabase SQL Editor or with the Supabase CLI after linking the project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The generated-style TypeScript database contract is in `lib/supabase/database.types.ts`. Regenerate it after future schema changes. Keep RLS enabled; authenticated application code should never bypass it.

## PWA / iPhone usage

TaskFlow includes an App Router manifest, standalone display metadata, dark theme and status-bar settings, Apple and maskable icons, dynamic viewport sizing, touch-friendly controls, and iPhone safe-area handling.

After deploying over HTTPS, open TaskFlow in iPhone Safari, tap **Share**, choose **Add to Home Screen**, and launch it from the new icon. The responsive layout preserves the app-like experience with mobile navigation and sheet-style forms, while Settings reports when TaskFlow is running in standalone mode.

There is currently no service worker, offline asset cache, background sync, or push notification support. The manifest and installed-app experience are groundwork for a fuller PWA; a network connection is still required to load or refresh the deployed application.

## V1 scope

V1 includes the complete local task workflow, realistic seeded data, filters, search, progress summaries, English/Thai switching, responsive layouts, accessible interaction patterns, animation, local persistence, and PWA metadata.

Accounts, active Supabase storage, cross-device synchronization, collaboration, recurring tasks, attachments, calendar integrations, analytics, AI features, push notifications, and guaranteed offline loading remain out of scope. The Supabase code and migration are integration preparation, not a claim that cloud sync is currently connected.

## Future roadmap

1. Add Supabase Auth screens and session-aware repository selection.
2. Migrate or import local tasks after sign-in, then enable cross-device CRUD through the private Broadcast channel.
3. Add Supabase adapter integration tests and end-to-end coverage for the primary task flows.
4. Introduce a deliberate service-worker/offline strategy before considering background sync or push notifications.
5. Evaluate recurring tasks and calendar views only after the focused personal workflow is stable.
