-- 150: the Worker adds to the daily totals.
--
-- Granted to the SERVICE ROLE ONLY, and that is the point of it. The app
-- itself cannot call this even if some future version of it tried, so the
-- counting stays server-side by permission and not merely by habit. anon and
-- authenticated are refused.
--
-- Takes a batch, because one row per request would be thousands of calls a
-- day for a number nobody reads in real time. The Worker holds a small tally
-- per isolate and sends it every fifty requests or every minute.

create or replace function public.bump_usage(payload jsonb)
returns jsonb
language sql security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with incoming as (
    select
      (r ->> 'day')::date                                  as day,
      r ->> 'feature'                                      as feature,
      r ->> 'platform'                                     as platform,
      -- Clamped here rather than trusted. A caller that sends nonsense gets
      -- its row ignored; a caller that sends an enormous number gets a
      -- believable one, instead of a CHECK throwing away the whole batch.
      -- 10,000 because the Worker flushes at fifty: anything near this is
      -- already impossible, and the rolled total is capped again below.
      least(greatest((r ->> 'n')::bigint, 1), 10000)       as n
    from jsonb_array_elements(coalesce(payload -> 'rows', '[]'::jsonb)) as r
    where r ->> 'day' ~ '^\d{4}-\d{2}-\d{2}$'
      and r ->> 'feature' in ('mushaf','hadith','poster','metals','prefs')
      and r ->> 'platform' in ('ios','android','web','other')
      and (r ->> 'n') ~ '^\d+$'
      -- A flush can be a minute late, or a day late across a restart; it can
      -- never be a year late. This stops a bad or hostile batch writing
      -- history the masjid would then have to explain.
      and (r ->> 'day')::date between (current_date - 7) and (current_date + 1)
  ),
  -- The same day, feature and platform can appear twice in one batch if two
  -- isolates flushed together; ON CONFLICT cannot see rows from its own
  -- statement, so they are added up first.
  rolled as (
    select day, feature, platform, least(sum(n), 50000) as n
      from incoming group by day, feature, platform
  ),
  written as (
    insert into public.app_usage as u (masjid_id, day, feature, platform, n)
    select public.masjid_or_sole(payload ->> 'masjid'), day, feature, platform, n
      from rolled
    on conflict (masjid_id, day, feature, platform) do update
      set n = u.n + excluded.n,
          last_seen_at = now()
    returning 1
  )
  select jsonb_build_object('ok', true, 'rows', (select count(*) from written));
$fn$;

revoke all on function public.bump_usage(jsonb) from public;
revoke all on function public.bump_usage(jsonb) from anon, authenticated;
grant execute on function public.bump_usage(jsonb) to service_role;
