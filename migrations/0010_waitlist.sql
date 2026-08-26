-- 0010_waitlist.sql — founding-access capture (Phase 00.5, WS3).
-- Additive + idempotent. No marketplace, no accounts: one row per email
-- address, written only through the validated, consent-gated server function.
--
-- email_norm is the lowercased dedup key (the unique constraint is the hard
-- spam guard across Vercel serverless instances; the per-IP rate limit in
-- code is best-effort on top).

create table if not exists waitlist_entries (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  email_norm  text not null unique,
  role        text not null
              check (role in ('sponsor', 'builder', 'brand', 'creator', 'captain', 'other')),
  product_key text not null
              check (product_key in ('bidthrone', 'foundersbid', 'culturebid', 'bidception')),
  consent     text not null,
  consent_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists waitlist_entries_product_created_at_idx
  on waitlist_entries (product_key, created_at desc);
