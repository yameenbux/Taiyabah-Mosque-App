-- 146: the app reports its own crash.
-- Applied 6 Oct 2026. Kept here so the write path is readable without a
-- database connection.

create or replace function public.report_app_crash(payload jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_masjid uuid;
  v_msg    text := btrim(coalesce(payload ->> 'message', ''));
  v_stack  text := btrim(coalesce(payload ->> 'stack', ''));
  v_ver    text := btrim(coalesce(payload ->> 'app_version', ''));
  v_plat   text := lower(btrim(coalesce(payload ->> 'platform', '')));
  v_screen text := btrim(coalesce(payload ->> 'screen', ''));
  v_print  text;
begin
  v_masjid := public.masjid_or_sole(payload ->> 'masjid');

  if v_msg = '' or v_ver = '' then return jsonb_build_object('ok', false); end if;
  if v_plat not in ('android','ios') then return jsonb_build_object('ok', false); end if;

  -- Trimmed HERE rather than trusted from the app, so a client that sends too
  -- much is cut down instead of having its report thrown away by a CHECK.
  v_msg    := left(v_msg, 500);
  v_stack  := nullif(left(v_stack, 8000), '');
  v_screen := nullif(left(v_screen, 64), '');

  -- The same fault from a hundred phones is one row. The version is part of
  -- the key, so a fault that comes back after a release is a NEW row rather
  -- than a resurrected one.
  v_print := substr(md5(v_msg || coalesce(split_part(v_stack, E'\n', 1), '')), 1, 32);

  insert into public.app_crashes
    (masjid_id, fingerprint, app_version, build, platform, os_version, device, screen, message, stack)
  values
    (v_masjid, v_print, left(v_ver, 32),
     nullif(left(btrim(coalesce(payload ->> 'build','')), 32), ''),
     v_plat,
     nullif(left(btrim(coalesce(payload ->> 'os_version','')), 64), ''),
     nullif(left(btrim(coalesce(payload ->> 'device','')), 120), ''),
     v_screen, v_msg, v_stack)
  on conflict (masjid_id, fingerprint, app_version) do update
    set seen = public.app_crashes.seen + 1,
        last_seen_at = now(),
        -- A fault that comes back after somebody marked it fixed is not fixed.
        fixed_at = null;

  return jsonb_build_object('ok', true);
exception
  -- Reporting a crash must never itself be an error the app has to handle:
  -- it is already in its worst state. A refused report is simply not stored.
  when others then return jsonb_build_object('ok', false);
end $fn$;

revoke all on function public.report_app_crash(jsonb) from public;
grant execute on function public.report_app_crash(jsonb) to anon, authenticated;
