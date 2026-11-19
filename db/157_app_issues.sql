-- 157: a person can report that something in the app is not working.
-- Applied to the project on 17 Nov 2026. Kept here so the schema is readable
-- without a database connection.
--
-- The automatic crash reporter (145-146) says when the app FELL OVER on its
-- own. This is the other half: a person tapping "Report a problem" because
-- something did not load, or a screen showed an error, before they give up and
-- ring the office. It carries an optional note in their own words and the
-- short breadcrumb log the app was already keeping — the last few screens and
-- the last error it saw — which is usually what makes a "it doesn't work"
-- reproducible.
--
-- Same privacy stance as the crash table, and for the same reason: the masjid's
-- own Supabase, not a third-party processor the privacy notice would have to
-- name, and nothing in the payload that identifies a person. report_app_issue()
-- takes a version, a platform, a device MODEL (not an id), and words the person
-- chose to type; the CHECK constraints keep it that way.

create table if not exists public.app_issues (
  id           uuid primary key default gen_random_uuid(),
  masjid_id    uuid not null references public.masjids(id) on delete cascade,
  created_at   timestamptz not null default now(),
  app_version  text not null,
  build        text,
  platform     text not null check (platform in ('android','ios')),
  os_version   text,
  -- The model, not a device id: "Pixel 7" is what makes a fault reproducible,
  -- and nothing here is unique to one phone.
  device       text,
  screen       text,     -- where they were when they reported it
  note         text,     -- what they typed, optional
  log          text,     -- the breadcrumb trail the app kept
  handled_at   timestamptz,  -- the office marks it dealt with
  constraint app_issues_sane check (
    length(app_version) <= 32  and
    length(coalesce(build,'')) <= 32 and
    length(coalesce(os_version,'')) <= 64 and
    length(coalesce(device,'')) <= 120 and
    length(coalesce(screen,'')) <= 64 and
    length(coalesce(note,'')) <= 1000 and
    length(coalesce(log,'')) <= 8000
  )
);

alter table public.app_issues enable row level security;
revoke all on public.app_issues from anon, authenticated;

create index if not exists app_issues_open_idx
  on public.app_issues (masjid_id, created_at desc) where handled_at is null;

-- A phone cannot flood the table: a ceiling on NEW reports per masjid per hour.
-- Higher than the crash ceiling (40) because a report is a deliberate human act
-- rather than an automatic loop, so a real burst — a release that breaks one
-- screen — is signal, not noise, up to a point.
create or replace function public.app_issues_rate_limit()
returns trigger language plpgsql security definer set search_path to 'public'
as $fn$
declare fresh int;
begin
  select count(*) into fresh
    from public.app_issues
   where masjid_id = new.masjid_id and created_at > now() - interval '1 hour';
  if fresh >= 60 then
    raise exception 'Too many problem reports in the last hour.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

drop trigger if exists app_issues_rate_limit_trg on public.app_issues;
create trigger app_issues_rate_limit_trg
  before insert on public.app_issues
  for each row execute function public.app_issues_rate_limit();

-- The write path, mirroring report_app_crash: security definer so a locked-down
-- table can still be written through one audited door; fields trimmed HERE so a
-- client that sends too much is cut down rather than having its report thrown
-- away by a CHECK; and it refuses SILENTLY, because the app reporting a problem
-- must never be handed a second one.
create or replace function public.report_app_issue(payload jsonb)
returns jsonb language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_masjid uuid;
  v_ver    text := btrim(coalesce(payload ->> 'app_version', ''));
  v_plat   text := lower(btrim(coalesce(payload ->> 'platform', '')));
begin
  v_masjid := public.masjid_or_sole(payload ->> 'masjid');

  if v_ver = '' then return jsonb_build_object('ok', false); end if;
  if v_plat not in ('android','ios') then return jsonb_build_object('ok', false); end if;

  insert into public.app_issues
    (masjid_id, app_version, build, platform, os_version, device, screen, note, log)
  values
    (v_masjid, left(v_ver, 32),
     nullif(left(btrim(coalesce(payload ->> 'build','')), 32), ''),
     v_plat,
     nullif(left(btrim(coalesce(payload ->> 'os_version','')), 64), ''),
     nullif(left(btrim(coalesce(payload ->> 'device','')), 120), ''),
     nullif(left(btrim(coalesce(payload ->> 'screen','')), 64), ''),
     nullif(left(btrim(coalesce(payload ->> 'note','')), 1000), ''),
     nullif(left(btrim(coalesce(payload ->> 'log','')), 8000), ''));

  return jsonb_build_object('ok', true);
exception
  when others then return jsonb_build_object('ok', false);
end $fn$;

revoke all on function public.report_app_issue(jsonb) from public;
grant execute on function public.report_app_issue(jsonb) to anon, authenticated;
