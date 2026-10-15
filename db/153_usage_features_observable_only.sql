-- 153: count only what this server can actually see.
--
-- 'notices' and 'timetable' were in 149's feature list on the assumption that
-- the app fetched both through the Worker. It does not — it reads them
-- straight from Supabase — so neither could ever have produced a number.
--
-- Worse than useless, in the case of notices: /api/notice is the OFFICE
-- publishing one, behind a session token. A count of it would have appeared
-- in the portal under "notices" and been read as how many people were reading
-- them, while actually measuring how often the office posted. A number that
-- means the opposite of what it looks like is worse than a blank.
--
-- Applied 15 Oct 2026, together with the tighter per-row clamp (10,000 rather
-- than 1,000,000 — the Worker flushes at fifty, so anything near either is
-- already impossible) and a cap on the rolled-up total.

alter table public.app_usage drop constraint if exists app_usage_feature_known;

alter table public.app_usage add constraint app_usage_feature_known
  check (feature in ('mushaf','hadith','poster','metals','prefs'));

-- bump_usage() was replaced in the same migration with the narrowed allowlist
-- and the tighter clamps. Its body is in 150_bump_usage.sql, which carries the
-- current definition.
