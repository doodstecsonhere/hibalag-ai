# Chat ownership integrity migration

Status: prepared and tested locally only. Not applied to production.

The checked-in `supabase/config.toml` is for isolated local development only.
It does not describe or change production Auth, networking, or billing settings.

## Purpose

`chat_messages.user_id` must identify the same owner as the referenced
`chat_threads.user_id`. The existing RLS policy prevents users from seeing or
editing another user's message rows, but it does not prevent a user-owned
message from referencing another user's thread.

Migration `20260827031842_enforce_chat_message_thread_ownership.sql` adds:

- a unique owner key on `chat_threads (id, user_id)`; and
- a composite cascading foreign key from
  `chat_messages (thread_id, user_id)` to that owner key.

The migration first checks for mixed-owner rows while holding both tables
against concurrent writes. If any conflict exists, it aborts without modifying
or deleting data. It does not rewrite existing rows.

## Production preflight

Before applying the migration, take and verify a fresh encrypted backup. Run a
read-only conflict count and stop unless it returns zero:

```sql
select count(*) as ownership_conflicts
from public.chat_messages as message
join public.chat_threads as thread on thread.id = message.thread_id
where message.user_id is distinct from thread.user_id;
```

Do not display the conflicting rows. If the count is nonzero, design and approve
a separate data-repair plan before applying this migration.

## Rollback SQL

Rollback changes structure only; it does not restore deleted or changed data.
Run it only with a fresh backup and separate production approval.

```sql
begin;

lock table public.chat_threads, public.chat_messages in share row exclusive mode;

alter table public.chat_messages
  drop constraint chat_messages_thread_owner_fkey,
  add constraint chat_messages_thread_id_fkey
    foreign key (thread_id)
    references public.chat_threads (id)
    on delete cascade;

alter table public.chat_threads
  drop constraint chat_threads_id_user_id_key;

commit;
```

After rollback, rerun the ownership test that originally exposed the gap. It
should demonstrate that the old relationship is restored. Reapply the reviewed
migration to restore the protection.

## Local verification evidence

Completed on 2026-08-27 with fictional accounts in disposable local Supabase
containers:

- migration preflight rejected a deliberately mismatched legacy row and left
  the original constraints intact;
- migration applied after removing only that fictional conflict;
- the committed pgTAP suite passed 7 of 7 checks;
- owner CRUD and application-style message queries passed;
- anonymous and cross-user reads, updates, deletes, and inserts were denied;
- two users completed local Auth signup, email confirmation, and login, and the
  database accepted the matching owner while rejecting the other user;
- deleting a thread cascaded only its messages and did not delete Auth users;
- the rollback restored the old constraint and reproduced the old ownership
  gap, after which reapplying the migration restored the protection; and
- the independent application build and TypeScript check passed with live AI
  unused.

All fictional users and rows were removed. The disposable Hibalag containers
and network were removed without deleting shared images or affecting `n8n_app`.
