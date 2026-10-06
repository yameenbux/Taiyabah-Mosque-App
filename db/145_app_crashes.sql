-- 145-146: the app can say it crashed.
-- Applied to the project on 6 Oct 2026 as migrations 145a-e and 146, 146b.
-- Kept here so the schema is readable without a database connection.
--
-- Deliberately NOT a third-party crash reporter: the privacy notice names
-- Stripe and the masjid and nothing else, and adding a data processor to it
-- for a congregation that did not ask for one is a bigger decision than this
-- problem warrants.

create table if not exists public.app_crashes (
  id            uuid primary key default gen_random_uuid(),
  masjid_id     uuid not null references public.masjids(id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  -- Same fault, same fingerprint: a crash loop is ONE row with a count.
  fingerprint   text not null,
  seen          int  not null default 1,
  app_version   text not null,
  build         text,
  platform      text not null check (platform in ('android','ios')),
  os_version    text,
  device        text,
  screen        text,
  message       text not null,
  stack         text,
  fixed_at      timestamptz,
  -- What a row MAY hold, enforced rather than promised.
  constraint app_crashes_sane check (
    length(fingerprint) <= 64  and
    length(app_version) <= 32  and
    length(coalesce(build,'')) <= 32 and
    length(coalesce(os_version,'')) <= 64 and
    length(coalesce(device,'')) <= 120 and
    length(coalesce(screen,'')) <= 64 and
    length(message) <= 500 and
    length(coalesce(stack,'')) <= 8000
  ),
  unique (masjid_id, fingerprint, app_version)
);

alter table public.app_crashes enable row level security;
revoke all on public.app_crashes from anon, authenticated;

create index if not exists app_crashes_open_idx
  on public.app_crashes (masjid_id, last_seen_at desc) where fixed_at is null;

-- A phone that is crash-looping must not fill the table either. The ceiling is
-- on NEW faults per masjid per hour; the count on an existing row keeps
-- climbing, which is the useful signal and costs one update.
create or replace function public.app_crashes_rate_limit()
returns trigger language plpgsql security definer set search_path to 'public'
as $fn$
declare fresh int;
begin
  select count(*) into fresh
    from public.app_crashes
   where masjid_id = new.masjid_id and created_at > now() - interval '1 hour';
  if fresh >= 40 then
    raise exception 'Too many new crash reports in the last hour.'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

create trigger app_crashes_rate_limit_trg
  before insert on public.app_crashes
  for each row execute function public.app_crashes_rate_limit();
