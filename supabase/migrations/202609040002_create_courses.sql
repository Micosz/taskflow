create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  code text,
  name text not null default '',
  dedupe_key text generated always as (
    lower(btrim(coalesce(nullif(btrim(code), ''), name)))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_value_required
    check (char_length(btrim(coalesce(code, '') || name)) between 1 and 152),
  constraint courses_code_valid
    check (code is null or char_length(btrim(code)) between 1 and 32),
  constraint courses_name_valid
    check (char_length(name) <= 120),
  constraint courses_owner_dedupe_unique
    unique (user_id, dedupe_key)
);

create index courses_owner_updated_idx
  on public.courses (user_id, updated_at desc);

create or replace function public.set_course_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_course_updated_at();

revoke all on function public.set_course_updated_at() from public;

alter table public.courses enable row level security;

revoke all on table public.courses from anon, authenticated;
grant select, insert, update, delete on table public.courses to authenticated;

create policy "courses_select_own"
on public.courses
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "courses_insert_own"
on public.courses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "courses_update_own"
on public.courses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "courses_delete_own"
on public.courses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.broadcast_course_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owning_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  perform realtime.broadcast_changes(
    'taskflow:courses:' || owning_user_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

create trigger courses_broadcast_changes
after insert or update or delete on public.courses
for each row
execute function public.broadcast_course_changes();

revoke all on function public.broadcast_course_changes() from public;

create policy "taskflow_users_receive_own_course_changes"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) =
    'taskflow:courses:' || (select auth.uid())::text
);

-- Keep Realtime's "Allow public access" disabled so private channels must
-- pass the per-user authorization policy above.
