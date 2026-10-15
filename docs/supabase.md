# Supabase and storage

Supabase cloud mode is active whenever valid public configuration is available and the user signs in. Missing or invalid configuration does not break guest mode.

To prepare a Supabase project:

1. Create a project and enable email/password authentication.
2. Copy `.env.example` to `.env.local` and add the project URL plus a publishable key.
3. Apply every file in `supabase/migrations/` in filename order: tasks, task-import keys, Saved Courses, then undated Todo. The Todo migration depends on the task timestamp function.
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

The checked-in migrations create:

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

The generated-style TypeScript database contract is in `src/lib/supabase/database.types.ts`. Regenerate it after future schema changes. Normal task and course creation omit `user_id` and let PostgreSQL default it from `auth.uid()`; migration ownership also remains protected by each INSERT `WITH CHECK` policy.

Todo has a separate owner-scoped table and private `taskflow:todos:<user-id>` Broadcast topic. Todo creation/import explicitly supplies the captured user ID, so stale requests fail RLS after an account switch. Guest Todo imports use their own explicit action and verify cloud content before removing unchanged local entries.
