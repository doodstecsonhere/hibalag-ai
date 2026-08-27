begin;

-- Keep the preflight check and constraint swap free from concurrent writes.
lock table public.chat_threads, public.chat_messages in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.chat_messages as message
    join public.chat_threads as thread on thread.id = message.thread_id
    where message.user_id is distinct from thread.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'chat message/thread ownership conflicts must be resolved before applying this migration';
  end if;
end
$$;

alter table public.chat_threads
  add constraint chat_threads_id_user_id_key unique (id, user_id);

alter table public.chat_messages
  drop constraint chat_messages_thread_id_fkey,
  add constraint chat_messages_thread_owner_fkey
    foreign key (thread_id, user_id)
    references public.chat_threads (id, user_id)
    on delete cascade;

commit;
