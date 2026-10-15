-- 149: what the app is used for, counted without counting anybody.
--
-- WHY THIS EXISTS. There was no way to answer "does anybody actually use the
-- Qur'an reader?", which made every decision about what to build or retire a
-- guess.
--
-- WHAT IT MAY NOT HOLD, and why that is a constraint rather than a choice.
-- The privacy notice tells the congregation that the Qur'an, the qibla and
-- the rest "work without an account and without sending anything about you
-- anywhere", and that there is "no tracking of any kind". So:
--
--   * The app sends nothing new. Every count here comes from a request the
--     masjid's own server was already receiving — a muṣḥaf page, a poster, a
--     gold rate. Nothing was added to any request to make this possible.
--   * There is no identifier in this table and no column one could be put in
--     without changing its shape. No IP, no user agent, no device, no
--     session, no free text.
--   * A row is a running total, not an event. Individual requests are never
--     stored, so there is no log here that could later be mined for a
--     pattern of one person's reading.
--   * `platform` is the one word read out of the user agent that was already
--     in the request. The agent string itself is never written down.
--
-- The same reasoning as 145: deliberately NOT a third-party analytics
-- product, because the privacy notice names Stripe and the masjid and nothing
-- else, and adding a data processor for a congregation that did not ask for
-- one is a bigger decision than this problem warrants.

create table if not exists public.app_usage (
  masjid_id     uuid not null references public.masjids(id) on delete cascade,
  -- London's date. The masjid's day, not UTC's.
  day           date not null,
  -- From a fixed list. A crafted URL must not be able to invent rows.
  feature       text not null,
  platform      text not null,
  n             bigint not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),

  -- What a row MAY hold, enforced rather than promised. Anything that is not
  -- on these lists is not storable, so the promise above cannot be broken by
  -- a later caller getting it wrong.
  -- Narrowed by 153 once the routes were READ rather than assumed. 'notices'
  -- and 'timetable' were on this list and are not observable here: the
  -- congregation reads both straight from Supabase, and /api/notice is the
  -- OFFICE publishing one. Counting that route would have produced a number
  -- that read as "how many people read the notices" and meant "how often the
  -- office posted".
  constraint app_usage_feature_known check (
    feature in ('mushaf','hadith','poster','metals','prefs')),
  constraint app_usage_platform_known check (
    platform in ('ios','android','web','other')),
  constraint app_usage_sane check (n >= 0 and n <= 100000000),

  primary key (masjid_id, day, feature, platform)
);

comment on table public.app_usage is
  'Daily totals of requests the masjid''s own server already received. No identifiers, by construction: see 149_app_usage.sql.';

-- Reading is by the two functions below and by nothing else. RLS is on with
-- no policy, which denies every direct select — the functions are SECURITY
-- DEFINER and are the only way in.
alter table public.app_usage enable row level security;
