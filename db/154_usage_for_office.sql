-- 154: the same totals, for the office's own admin page.
--
-- There are two readers and they sign in in different ways, which is why
-- there are two functions rather than one.
--
--   usage_summary()    (151) — for anybody holding a Supabase session: the
--                      imams and the portal. Guarded by verified_admin() or
--                      verified_office(), granted to `authenticated`.
--   usage_for_office() (here) — for admin.html, which signs in against the
--                      WORKER with a session token and has no Supabase
--                      account at all. The Worker's service key is what
--                      reaches the database, so the guard cannot be
--                      verified_admin(): to the database this call has no
--                      user. The guard is the Worker's own token check on
--                      /api/usage, and this function is granted to
--                      service_role and to nothing else.
--
-- Neither returns anything about an individual, because 149 has nothing about
-- an individual in it.

create or replace function public.usage_for_office(p_days int default 30)
returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
  with scope as (
    select least(greatest(coalesce(p_days, 30), 1), 365) as days,
           public.sole_masjid() as masjid
  ),
  rows_in_window as (
    select u.day, u.feature, u.platform, u.n
      from public.app_usage u, scope s
     where u.masjid_id = s.masjid
       and u.day > current_date - s.days
  )
  select jsonb_build_object(
    'ok',   true,
    'days', (select days from scope),
    'from', (current_date - (select days from scope)),
    'to',   current_date,
    -- Biggest first, so "does anybody use the Qur'an reader" is the first
    -- line of the answer rather than something to go looking for.
    'totals', coalesce((
      select jsonb_agg(t order by (t ->> 'n')::bigint desc)
        from (select jsonb_build_object('feature', feature, 'n', sum(n)) as t
                from rows_in_window group by feature) q), '[]'::jsonb),
    'platforms', coalesce((
      select jsonb_agg(t order by (t ->> 'n')::bigint desc)
        from (select jsonb_build_object('platform', platform, 'n', sum(n)) as t
                from rows_in_window group by platform) q), '[]'::jsonb),
    'by_day', coalesce((
      select jsonb_agg(t order by t ->> 'day')
        from (select jsonb_build_object('day', day, 'n', sum(n)) as t
                from rows_in_window group by day) q), '[]'::jsonb));
$fn$;

revoke all on function public.usage_for_office(int) from public;
revoke all on function public.usage_for_office(int) from anon, authenticated;
grant execute on function public.usage_for_office(int) to service_role;
