begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select ok(
  not has_function_privilege('anon', 'public.rls_auto_enable()', 'execute'),
  'anonymous API clients cannot execute the privileged event-trigger function'
);

select ok(
  not has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute'),
  'signed-in API clients cannot execute the privileged event-trigger function'
);

select ok(
  not has_function_privilege('service_role', 'public.rls_auto_enable()', 'execute'),
  'the Data API service role cannot call the event-trigger function as an RPC'
);

select ok(
  has_function_privilege('postgres', 'public.rls_auto_enable()', 'execute'),
  'the postgres owner retains execution privilege'
);

select ok(
  exists (
    select 1
    from pg_event_trigger as event_trigger
    join pg_proc as function on function.oid = event_trigger.evtfoid
    join pg_namespace as namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'public'
      and function.proname = 'rls_auto_enable'
      and event_trigger.evtenabled <> 'D'
  ),
  'the RLS event trigger remains enabled'
);

select ok(
  exists (
    select 1
    from pg_index as index
    where index.indexrelid = 'public.chat_messages_thread_owner_idx'::regclass
      and index.indrelid = 'public.chat_messages'::regclass
      and index.indnkeyatts = 2
      and index.indkey[0] = (
        select attribute.attnum
        from pg_attribute as attribute
        where attribute.attrelid = 'public.chat_messages'::regclass
          and attribute.attname = 'thread_id'
      )
      and index.indkey[1] = (
        select attribute.attnum
        from pg_attribute as attribute
        where attribute.attrelid = 'public.chat_messages'::regclass
          and attribute.attname = 'user_id'
      )
  ),
  'the composite ownership foreign key has a covering index'
);

select * from finish();

rollback;
