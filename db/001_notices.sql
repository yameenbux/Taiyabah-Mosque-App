-- ===========================================================================
--  001_notices.sql — notices that outlive the notification
--
--  Taiyabah Masjid · Bolton Central Islamic Society · Charity 1041569
--
--  WHY THIS EXISTS
--  ---------------
--  A push notification is delivered and then gone. Somebody who was driving,
--  or who swiped it away, or who installed the app the next day, has no way
--  back to it. The Notices tab has said "coming soon" since it was written,
--  for exactly one reason: there was nowhere to keep an announcement. This is
--  that place.
--
--  WHERE THIS RUNS
--  ---------------
--  The SAME Supabase project as the hall bookings and the website —
--  phenbhmobxwyvdeshvqw. Apply it there, not to a new project, or the app
--  will hold one anon key for two different databases.
--
--  WHO CAN WRITE
--  -------------
--  Nobody, through the public key. The app ships that key in plain sight, so
--  anything it can write, anyone can write — and a masjid's announcements
--  board is a bad thing to leave open. Notices are inserted by the Cloudflare
--  Worker using the service key, which never leaves Cloudflare's secret store
--  and which already guards the notification sender behind the office
--  password.
--
--  Prerequisites: none. Idempotent.
-- ===========================================================================

create table if not exists public.notices (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Which switch in the app decides whether this was pushed. Matching the
  -- notification topics keeps one vocabulary across the app, the admin screen
  -- and the Worker rather than three that drift.
  topic        text not null default 'announcements'
                 check (topic in ('announcements','events','janazah','kahf')),

  title        text not null check (length(btrim(title)) between 1 and 70),
  body         text not null check (length(btrim(body))  between 1 and 2000),

  -- A poster, if there is one. Notices are perfectly good without one.
  image_url    text,
  image_w      int,
  image_h      int,

  -- When the thing being announced happens. Null for a notice that is not an
  -- event — a timetable change, say. Used to sort and to retire.
  event_at     timestamptz,

  -- When it should stop being shown. Defaulted from event_at by the Worker so
  -- last month's bayaan does not sit at the top of the list for ever.
  expires_at   timestamptz,

  -- Taken down without deleting, so a mistake can be pulled immediately and
  -- still be accounted for afterwards.
  published    boolean not null default true
);

create index if not exists notices_live_idx
  on public.notices (created_at desc)
  where published;

comment on table public.notices is
  'Masjid announcements, kept so a notification that was missed can still be read. Publicly readable while live; written only by the notification Worker with the service key.';


-- ---------------------------------------------------------------------------
--  What the public may see
--
--  A view rather than a policy on the table, so the columns the app gets are
--  chosen here rather than being whatever the table happens to grow. Nothing
--  personal is in this table and nothing personal may ever be added to it —
--  it is world-readable by design.
-- ---------------------------------------------------------------------------
drop view if exists public.notices_live;

create view public.notices_live
with (security_invoker = off) as
  select id, created_at, topic, title, body, image_url, image_w, image_h, event_at
    from public.notices
   where published
     and (expires_at is null or expires_at > now())
   order by coalesce(event_at, created_at) desc;

comment on view public.notices_live is
  'The notices the app shows: published, not expired, newest first. World-readable — the app reads it with the publishable key — so nothing personal may ever appear here.';

grant select on public.notices_live to anon, authenticated;

-- The table itself stays shut to the public key. Row Level Security with no
-- policy denies everything, which is what we want: the service key bypasses
-- RLS, and nothing else gets in.
alter table public.notices enable row level security;
revoke all on public.notices from anon, authenticated;


-- ---------------------------------------------------------------------------
--  Posters
--
--  A public bucket, because the image URL goes inside a push notification and
--  the phone fetches it before anybody has signed in to anything. Public read,
--  no public write — uploads go through the Worker on the service key.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notices', 'notices', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
