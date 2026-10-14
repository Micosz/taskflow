begin;
-- Undated reminders are separate from scheduled tasks. No due-date/time columns.
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  completed boolean not null default false,
  migration_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, migration_key)
);
create index todos_owner_status_created_idx on public.todos(user_id, completed, created_at desc);
create trigger todos_set_updated_at before update on public.todos
for each row execute function public.set_task_updated_at();
alter table public.todos enable row level security;
revoke all on public.todos from anon, authenticated;
grant select, insert, update, delete on public.todos to authenticated;
create policy todos_select_own on public.todos for select to authenticated using ((select auth.uid()) = user_id);
create policy todos_insert_own on public.todos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy todos_update_own on public.todos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy todos_delete_own on public.todos for delete to authenticated using ((select auth.uid()) = user_id);
create function public.broadcast_todo_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.broadcast_changes('taskflow:todos:' || coalesce(new.user_id, old.user_id)::text,
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
  return null;
end;
$$;
create trigger todos_broadcast_changes after insert or update or delete on public.todos
for each row execute function public.broadcast_todo_changes();
revoke all on function public.broadcast_todo_changes() from public;
create policy taskflow_users_receive_own_todo_changes on realtime.messages for select to authenticated
using (realtime.messages.extension = 'broadcast' and (select realtime.topic()) = 'taskflow:todos:' || (select auth.uid())::text);

commit;
