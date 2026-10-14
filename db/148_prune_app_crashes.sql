-- 148: crash reports do not pile up for ever.
--
-- WHAT WAS AND WAS NOT WRONG. 145 already bounds this well: the same fault
-- from a hundred phones is ONE row, because (masjid_id, fingerprint,
-- app_version) is unique and a repeat only bumps `seen` and `last_seen_at`.
-- A phone stuck in a crash loop therefore costs one update, not one row, and
-- a trigger caps NEW faults at forty per masjid per hour. So a crash loop
-- across five thousand congregants does not fill anything.
--
-- What has no bound is TIME. Nothing ever removes a row, so every distinct
-- fault the app has ever had is kept for ever, including ones from versions
-- nobody is running any more and ones somebody has already marked fixed. That
-- is slow and small rather than dangerous, but it is the sort of thing that is
-- only ever noticed when the database is already full.
--
-- Two rules, both conservative, because a crash report is evidence and
-- deleting evidence early is worse than keeping it too long:
--   * marked fixed, and untouched for 30 days  -> gone
--   * not seen at all for 180 days             -> gone
-- Anything open and recent is kept whatever its age.
--
-- Called once a day by the Worker's cron (see worker.js), rather than by
-- pg_cron, so that it is visible in code that is read and tested, and so it
-- does not depend on an extension being enabled.

-- WRITTEN AS ONE SQL STATEMENT, not plpgsql, and quoted with '' rather than
-- $$. That is not taste: the tooling that applies migrations to this project
-- hangs on a dollar-quoted body and on a body containing semicolons — it
-- never returns and nothing is applied. A function that cannot be deployed is
-- not a function. Two data-modifying CTEs do the same work in one statement.
--
-- The two rules are disjoint (the second requires fixed_at is null) so a row
-- caught by both is not counted twice.

create or replace function public.prune_app_crashes() returns jsonb
language sql security definer set search_path to 'public', 'pg_temp'
as '
with fixed as (
  delete from public.app_crashes
   where fixed_at is not null
     and fixed_at < now() - interval ''30 days''
  returning 1),
stale as (
  delete from public.app_crashes
   where fixed_at is null
     and last_seen_at < now() - interval ''180 days''
  returning 1)
select jsonb_build_object(
  ''ok'', true,
  ''fixed'', (select count(*) from fixed),
  ''stale'', (select count(*) from stale))
';

-- A congregant's app reports crashes; it has no business deleting them, and
-- anon must never be able to clear the evidence.
revoke all on function public.prune_app_crashes() from public, anon, authenticated;

-- But the Worker calls this through PostgREST with the service key, which is
-- service_role — and revoking from PUBLIC took away the only grant it had.
-- Without this the nightly prune is a 403 every night, logged and ignored.
-- Caught by checking has_function_privilege after applying, not by assuming.
grant execute on function public.prune_app_crashes() to service_role;
