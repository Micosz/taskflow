-- Idempotency key for explicit local-to-cloud imports. Normal task CRUD leaves
-- this nullable; a repeated import for the same user becomes a no-op.
alter table public.tasks
add column migration_key text;

alter table public.tasks
add constraint tasks_migration_key_valid
check (
  migration_key is null
  or char_length(migration_key) between 1 and 260
);

alter table public.tasks
add constraint tasks_owner_migration_key_unique
unique (user_id, migration_key);
