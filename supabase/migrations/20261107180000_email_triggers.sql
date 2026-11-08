-- Send RSVP emails right away, and run the showtime / reminder / thank-you sweep every 5 minutes.
-- Both call the send-email edge function, which de-duplicates through public.email_log.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.notify_rsvp_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform net.http_post(
      url := 'https://sfcifdwmkfekakjjpter.supabase.co/functions/v1/send-email',
      body := jsonb_build_object('rsvp_id', new.id, 'previous_status', case when tg_op = 'UPDATE' then old.status end),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end $$;
revoke all on function public.notify_rsvp_email() from public, anon, authenticated;

drop trigger if exists rsvps_send_email on public.rsvps;
create trigger rsvps_send_email after insert or update of status on public.rsvps
  for each row execute function public.notify_rsvp_email();

select cron.schedule('slipstream-email-sweep', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://sfcifdwmkfekakjjpter.supabase.co/functions/v1/send-email',
    body := '{"sweep": true}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
$cron$);
