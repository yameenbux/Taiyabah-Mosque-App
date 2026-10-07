-- 147: which prayer years are published, and where each came from.
-- Applied 6 Oct 2026. prayer_year() itself is untouched — it is the call the
-- website makes and its contract is not ours to change.
--
-- The app needs this for two things: to say WHICH years it can answer for when
-- it has no times for today, and to name the right year's paperwork under the
-- month it is showing. (The `note` is the committee's internal record —
-- "Seeded from build-inputs/full2026.json" — so the app reads the years and
-- deliberately does not show the note to anybody.)

create or replace function public.prayer_years_published(p_masjid text default null)
returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object('year', y.year, 'note', coalesce(y.note, ''))
                            order by y.year), '[]'::jsonb)
    from public.prayer_years y
   where y.masjid_id = coalesce(
           -- no masjid named means the only one there is, matching
           -- prayer_year()'s own one-argument form.
           case when p_masjid is null then null else public.masjid_id_for(p_masjid) end,
           public.sole_masjid())
     and y.published;
$fn$;

revoke all on function public.prayer_years_published(text) from public;
grant execute on function public.prayer_years_published(text) to anon, authenticated;
