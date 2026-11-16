-- 156: prayer_years_published() raised even when told which masjid.
--
-- Found while checking that the 2027 timetable was visible. Not caused by that
-- load — this has been broken since the database grew a second masjid.
--
-- db/147 wrote the lookup as:
--
--   where y.masjid_id = coalesce(
--           case when p_masjid is null then null else masjid_id_for(p_masjid) end,
--           public.sole_masjid())
--
-- which reads as "the named masjid, or the only one if none was named". It is
-- not, because this is a plain SQL function: Postgres inlines it and evaluates
-- BOTH arms of the coalesce, so sole_masjid() runs even when a slug was given
-- — and sole_masjid() now raises, by design, because there is more than one
-- masjid. The result is that passing the slug, the very thing that should make
-- the call unambiguous, fails exactly as passing nothing does.
--
-- plpgsql instead of SQL, because an IF genuinely does not evaluate the branch
-- it does not take. sole_masjid() is now reached only when no slug is given,
-- which is the single-masjid case it was written for.
--
-- Nothing in the app calls this yet, so nobody has hit it. db/147 added it for
-- the app to use, so it would have been hit the moment somebody wired it up —
-- and the symptom (passing the slug does not help) is a confusing one to debug.
create or replace function public.prayer_years_published(p_masjid text default null)
returns jsonb
language plpgsql stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_masjid uuid;
begin
  if p_masjid is null then
    v_masjid := public.sole_masjid();
  else
    v_masjid := public.masjid_id_for(p_masjid);
  end if;

  return coalesce(
    (select jsonb_agg(jsonb_build_object('year', y.year, 'note', coalesce(y.note, ''))
                      order by y.year)
       from public.prayer_years y
      where y.masjid_id = v_masjid
        and y.published),
    '[]'::jsonb);
end $fn$;

revoke all on function public.prayer_years_published(text) from public;
grant execute on function public.prayer_years_published(text) to anon, authenticated;
