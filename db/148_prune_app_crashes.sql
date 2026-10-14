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

create or replace function public.prune_app_crashes()
returns jsonb language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_fixed int;
  v_stale int;
begin
  delete from public.app_crashes
   where fixed_at is not null
     and fixed_at < now() - interval '30 days';
  get diagnostics v_fixed = row_count;

  delete from public.app_crashes
   where last_seen_at < now() - interval '180 days';
  get diagnostics v_stale = row_count;

  return jsonb_build_object('ok', true, 'fixed', v_fixed, 'stale', v_stale);
exception
  when others then return jsonb_build_object('ok', false);
end $fn$;

-- The service key only. A congregant's app reports crashes; it has no business
-- deleting them, and anon must never be able to clear the evidence.
revoke all on function public.prune_app_crashes() from public, anon, authenticated;
