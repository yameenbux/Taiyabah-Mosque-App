-- 158 — Membership lock-down.
--
-- The old membership lookup authenticated a HOUSEHOLD from a name, a house
-- number and a postcode — all things a neighbour knows — so anyone could sit at
-- the screen and confirm that a named person is a member of this masjid, and
-- membership is special-category data. This replaces that with proof of control
-- of the EMAIL the register holds: a six-digit code to that inbox, then a
-- session token the app keeps.
--
-- There is still no account and no password. All four tables are RLS deny-all;
-- the ONLY thing that reads or writes them is the `membership` edge function,
-- which runs as service_role and does its own hashing, rate-limiting and
-- neutral answering. See supabase/functions/membership/index.ts and
-- native/src/screens/Membership.jsx.
--
-- Applied live to project phenbhmobxwyvdeshvqw on 2026-11-20.

-- The register snapshot. A household can share an email, so email_norm is NOT
-- unique. Figures are pence and carry the date they were true (as_of), because
-- a stale balance shown as if live is a lie.
create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  masjid           text not null,
  full_name        text not null,
  email_raw        text,
  email_norm       text generated always as (nullif(lower(btrim(email_raw)), '')) stored,
  phone            text,
  note             text,
  status           text,
  total_invoiced_p integer,
  total_paid_p     integer,
  outstanding_p    integer,
  as_of            date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists members_masjid_email_idx on public.members (masjid, email_norm);

-- A code in flight. code_hash is sha256(masjid:email:code) — the six digits
-- never touch the database or a log. attempts caps guessing; expires_at the window.
create table if not exists public.member_otp (
  id          uuid primary key default gen_random_uuid(),
  masjid      text not null,
  email_norm  text not null,
  code_hash   text not null,
  attempts    integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);
create index if not exists member_otp_lookup_idx on public.member_otp (masjid, email_norm, created_at desc);

-- A logged-in member. Only the sha256 of the token is stored, so a leak of this
-- table cannot be replayed. Re-validated and slid forward on every read.
create table if not exists public.member_session (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  masjid       text not null,
  email_norm   text not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists member_session_token_idx on public.member_session (token_hash);

-- What the office can see without ever seeing a code or a token: that a code was
-- sent, verified, failed or blocked. No content.
create table if not exists public.member_audit (
  id         bigint generated always as identity primary key,
  masjid     text not null,
  email_norm text,
  event      text not null,          -- 'sent' | 'verified' | 'failed' | 'blocked' | 'no_member'
  at         timestamptz not null default now()
);
create index if not exists member_audit_at_idx on public.member_audit (masjid, at desc);

-- Deny-all for the API roles: RLS on, zero policies, and no grant either.
alter table public.members        enable row level security;
alter table public.member_otp     enable row level security;
alter table public.member_session enable row level security;
alter table public.member_audit   enable row level security;

revoke all on public.members, public.member_otp, public.member_session, public.member_audit
  from anon, authenticated;

-- The edge function runs as service_role (the sb_secret_ key). It bypasses RLS
-- but still needs table privileges, which new tables in this project do not get
-- automatically — so the first deploy read back "permission denied for table
-- members" until this grant was added. anon/authenticated get nothing, so the
-- edge function is the only way in.
grant select, insert, update, delete
  on public.members, public.member_otp, public.member_session, public.member_audit
  to service_role;
grant usage, select on all sequences in schema public to service_role;
