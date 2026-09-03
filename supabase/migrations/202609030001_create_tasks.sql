create type public.task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  priority public.task_priority not null default 'medium',
  due_date date not null,
  due_time time without time zone,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_valid
    check (char_length(btrim(title)) between 1 and 180),
  constraint tasks_description_valid
    check (description is null or char_length(description) <= 4000),
  constraint tasks_category_valid
    check (char_length(btrim(category)) between 1 and 80)
);

create index tasks_owner_status_due_idx
  on public.tasks (user_id, completed, due_date, due_time);

create index tasks_owner_completed_updated_idx
  on public.tasks (user_id, updated_at desc)
  where completed = true;

create or replace function public.set_task_updated_at()
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

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_task_updated_at();

revoke all on function public.set_task_updated_at() from public;

alter table public.tasks enable row level security;

revoke all on table public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Broadcast changes on one private topic per owner. This keeps DELETE payloads
-- scoped without relying on Postgres Changes filters or replica identity.
create or replace function public.broadcast_task_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owning_user_id uuid := coalesce(new.user_id, old.user_id);
begin
  perform realtime.broadcast_changes(
    'taskflow:tasks:' || owning_user_id::text,
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

create trigger tasks_broadcast_changes
after insert or update or delete on public.tasks
for each row
execute function public.broadcast_task_changes();

revoke all on function public.broadcast_task_changes() from public;

drop policy if exists "taskflow_users_receive_own_task_changes"
on realtime.messages;

create policy "taskflow_users_receive_own_task_changes"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (select realtime.topic()) =
    'taskflow:tasks:' || (select auth.uid())::text
);

-- In the Supabase dashboard, disable Realtime's "Allow public access" setting
-- so every TaskFlow broadcast channel is required to pass this authorization.
