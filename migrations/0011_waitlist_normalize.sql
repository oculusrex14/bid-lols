-- 0011_waitlist_normalize.sql — founding-access data semantics (Phase 00.6, WS1).
-- Additive + idempotent.
--
-- The Phase 00.5 table waitlist_entries had UNIQUE(email_norm): a repeat
-- submission from another product or with another role OVERWROTE
-- product_key/role, destroying legitimate multi-product / multi-role intent.
--
-- Normalized model:
--   waitlist_people     — one row per email address (the person).
--   waitlist_interests  — one row per (person, product, role); the same email
--                         can simultaneously express e.g. FoundersBid/sponsor,
--                         FoundersBid/builder, CultureBid/creator,
--                         Bidception/captain.
--
-- Existing waitlist_entries rows are backfilled (no data loss) and the old
-- table is NOT dropped by this migration — it stays as a frozen archive and
-- receives no new writes from application code.

create table if not exists waitlist_people (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  email_norm  text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists waitlist_interests (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null
                references waitlist_people (id) on delete cascade,
  product_key   text not null
                check (product_key in ('bidthrone', 'foundersbid', 'culturebid', 'bidception')),
  role          text not null
                check (role in ('sponsor', 'builder', 'brand', 'creator', 'captain', 'other')),
  consent_text  text not null,
  consent_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (person_id, product_key, role)
);

create index if not exists waitlist_interests_person_created_at_idx
  on waitlist_interests (person_id, created_at desc);

-- Backfill: legacy rows are 1:1 person <-> interest (one row per email).
-- Idempotent: re-running is a no-op refresh with identical values.
insert into waitlist_people (id, email, email_norm, created_at, updated_at)
select id, email, email_norm, created_at, updated_at
from waitlist_entries
on conflict (email_norm)
do update set email = excluded.email, updated_at = excluded.updated_at;

insert into waitlist_interests (person_id, product_key, role, consent_text, consent_at, created_at, updated_at)
select e.id, e.product_key, e.role, e.consent, e.consent_at, e.created_at, e.updated_at
from waitlist_entries e
on conflict (person_id, product_key, role)
do update set consent_text = excluded.consent_text,
              consent_at   = excluded.consent_at,
              updated_at   = excluded.updated_at;
