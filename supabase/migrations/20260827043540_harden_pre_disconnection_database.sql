begin;

-- The event trigger runs internally as its postgres owner. API roles do not
-- need direct RPC access to this SECURITY DEFINER function.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
revoke execute on function public.rls_auto_enable() from service_role;

-- Cover the child columns used by the composite ownership foreign key.
create index if not exists chat_messages_thread_owner_idx
  on public.chat_messages (thread_id, user_id);

commit;
