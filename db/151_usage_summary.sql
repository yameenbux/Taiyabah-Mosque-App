-- 151: the office and the imams can see what the app is used for.
--
-- The counting in 149/150 is worth nothing if nobody can read it, and the
-- whole reason it exists is to replace a guess with a number. Same guard as
-- admin_dashboard(): an admin or the office, verified, or `allowed: false`.
--
-- Deliberately NOT granted to anon. These totals say nothing about any
-- individual, but how busy the masjid's app is is still the masjid's business
-- and not the open internet's.

create or replace function public.usage_summary(p_days int default 30)
returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with scope as (
    -- Clamped so a caller cannot ask for a decade and time the portal out.
    select least(greatest(coalesce(p_days, 30), 1), 365) as days,
           public.current_masjid()                       as masjid,
           (public.verified_admin() or public.verified_office()) as allowed
  ),
  rows_in_window as (
    select u.day, u.feature, u.platform, u.n
      from public.app_usage u, scope s
     where s.allowed
       and u.masjid_id = s.masjid
       and u.day > current_date - s.days
  )
  select case
    when not (select allowed from scope) then jsonb_build_object('allowed', false)
    else jsonb_build_object(
      'allowed', true,
      'days',    (select days from scope),
      'from',    (current_date - (select days from scope)),
      'to',      current_date,
      -- One line per feature: the headline the question was asked about.
      'totals', coalesce((
        select jsonb_agg(t order by t ->> 'feature')
          from (select jsonb_build_object('feature', feature, 'n', sum(n)) as t
                  from rows_in_window group by feature) q), '[]'::jsonb),
      -- And the split by platform, which answers "is the iOS build worth it".
      'platforms', coalesce((
        select jsonb_agg(t order by t ->> 'platform')
          from (select jsonb_build_object('platform', platform, 'n', sum(n)) as t
                  from rows_in_window group by platform) q), '[]'::jsonb),
      -- A series, so a trend is visible rather than just a total.
      'by_day', coalesce((
        select jsonb_agg(t order by t ->> 'day')
          from (select jsonb_build_object('day', day, 'feature', feature, 'n', sum(n)) as t
                  from rows_in_window group by day, feature) q), '[]'::jsonb))
  end;
$fn$;

revoke all on function public.usage_summary(int) from public;
revoke all on function public.usage_summary(int) from anon;
grant execute on function public.usage_summary(int) to authenticated;
