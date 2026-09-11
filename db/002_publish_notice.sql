-- ===========================================================================
--  002_publish_notice.sql — give the Worker the one privilege it needs
--
--  Taiyabah Masjid · Bolton Central Islamic Society · Charity 1041569
--
--  WHY THIS EXISTS
--  ---------------
--  001 assumed the service key could insert into public.notices, on the
--  grounds that it bypasses Row Level Security. It does — and it still could
--  not write, because RLS bypass is not a GRANT. `service_role` holds no
--  INSERT on any table in this project:
--
--      hall_bookings   service_role : REFERENCES, TRIGGER, TRUNCATE
--      nikah_requests  service_role : REFERENCES, TRIGGER, TRUNCATE
--      notices         service_role : REFERENCES, TRIGGER, TRUNCATE
--
--  That is deliberate, and it is the website's pattern: nothing writes a
--  table directly. Writes go through a `security definer` function that
--  validates what it is given — request_hall_booking, request_nikah_date.
--  The first send from the office failed with 42501 for exactly this reason.
--
--  The wrong fix is `grant insert on public.notices to service_role`. That
--  key lives in Cloudflare, reachable by an internet-facing Worker, and a
--  grant would widen it from "can do nothing" to "can write a table" — with
--  the next table to be added inheriting the same assumption.
--
--  The right fix is one function that does one thing. After this migration
--  the service key can publish a notice and still cannot read a hall booking,
--  read a nikāḥ request, or delete anything.
--
--  Prerequisites: 001_notices.sql. Idempotent.
-- ===========================================================================

create or replace function public.publish_notice(payload jsonb)
returns table (
  id         uuid,
  created_at timestamptz,
  topic      text,
  title      text,
  body       text,
  image_url  text,
  image_w    int,
  image_h    int,
  event_at   timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
-- Pinned, so the function cannot be redirected through a schema someone else
-- controls. A security definer function without this is the classic hole.
set search_path = public, pg_temp
as $$
begin
  -- Every constraint on the table still applies: the topic vocabulary, the
  -- title and body lengths. This function is a door, not a way round them.
  return query
  insert into public.notices as n (
    topic, title, body, image_url, image_w, image_h, event_at, expires_at
  )
  values (
    coalesce(nullif(payload->>'topic', ''), 'announcements'),
    payload->>'title',
    payload->>'body',
    nullif(payload->>'image_url', ''),
    (payload->>'image_w')::int,
    (payload->>'image_h')::int,
    (payload->>'event_at')::timestamptz,
    (payload->>'expires_at')::timestamptz
  )
  returning n.id, n.created_at, n.topic, n.title, n.body,
            n.image_url, n.image_w, n.image_h, n.event_at, n.expires_at;
end;
$$;

comment on function public.publish_notice(jsonb) is
  'The only way a notice is written. Called by the Cloudflare Worker with the service key, which holds no table privileges of its own. Not callable by anon or authenticated.';

-- Postgres grants EXECUTE to PUBLIC on a new function, which would make this
-- callable with the publishable key that ships inside the app. Take it back
-- before granting it to the one role that should have it.
revoke all on function public.publish_notice(jsonb) from public;
revoke all on function public.publish_notice(jsonb) from anon, authenticated;
grant execute on function public.publish_notice(jsonb) to service_role;
