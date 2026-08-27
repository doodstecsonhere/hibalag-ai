begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_threads'::regclass
      and conname = 'chat_threads_id_user_id_key'
      and contype = 'u'
  ),
  'threads expose a unique id/user_id owner key'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_thread_owner_fkey'
      and contype = 'f'
      and conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.chat_messages'::regclass and attname = 'thread_id'),
        (select attnum from pg_attribute where attrelid = 'public.chat_messages'::regclass and attname = 'user_id')
      ]::smallint[]
  ),
  'messages reference the parent thread with thread_id and user_id'
);

select ok(
  not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_messages'::regclass
      and conname = 'chat_messages_thread_id_fkey'
  ),
  'the unsafe single-column thread foreign key is absent'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000102');

insert into public.chat_threads (id, user_id, title)
values ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'fictional owner test');

select lives_ok(
  $$
    insert into public.chat_messages (id, thread_id, user_id, role, content)
    values (
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000101',
      'user',
      'fictional same-owner message'
    )
  $$,
  'same-owner message insert succeeds'
);

select throws_like(
  $$
    insert into public.chat_messages (id, thread_id, user_id, role, content)
    values (
      '00000000-0000-4000-8000-000000000302',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000102',
      'user',
      'fictional cross-owner message'
    )
  $$,
  '%violates foreign key constraint "chat_messages_thread_owner_fkey"%',
  'cross-owner message insert is rejected'
);

delete from public.chat_threads
where id = '00000000-0000-4000-8000-000000000201';

select is(
  (select count(*) from public.chat_messages where id = '00000000-0000-4000-8000-000000000301'),
  0::bigint,
  'same-owner message cascades when its thread is deleted'
);

select is(
  (select count(*) from auth.users where id in (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102'
  )),
  2::bigint,
  'thread cascade does not delete fictional Auth users'
);

select * from finish();

rollback;
