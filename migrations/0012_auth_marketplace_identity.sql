-- Phase 01 (WS1/WS2): identity + profiles for the FoundersBid marketplace.
-- STRICTLY ADDITIVE — new columns and new tables only; no legacy rows or
-- columns are altered destructively. The Phase 00 `users`/`sessions` shapes
-- were deliberately made Better Auth-compatible; this migration completes the
-- mapping so Better Auth 1.7 owns sessions/credentials on the SAME identity
-- core (no second user table, no sync).

-- ---------------------------------------------------------------------------
-- users: Better Auth `user` model fields (mapped: name->display_name stays the
-- display source of truth; email_verified/image/admin-plugin fields are new).
-- ---------------------------------------------------------------------------
alter table users add column if not exists email_verified boolean not null default false;
alter table users add column if not exists image text;
-- admin plugin (better-auth/plugins/admin) fields: Better Auth does NOT map
-- plugin-injected fields, so these columns use Better Auth's DEFAULT names
-- (quoted camelCase in Postgres). They are server-set only — never writable
-- from client input.
alter table users add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));
alter table users add column if not exists banned boolean not null default false;
alter table users add column if not exists "banReason" text;
alter table users add column if not exists "banExpires" timestamptz;

-- ---------------------------------------------------------------------------
-- sessions: Better Auth `session` model extras (bookkeeping only; the
-- impersonatedBy column exists because the admin plugin declares it).
-- ---------------------------------------------------------------------------
alter table sessions add column if not exists ip_address text;
alter table sessions add column if not exists user_agent text;
alter table sessions add column if not exists updated_at timestamptz not null default now();
alter table sessions add column if not exists "impersonatedBy" text;

-- ---------------------------------------------------------------------------
-- account: Better Auth credential/OAuth linkage (password hash lives here —
-- hashing is done by Better Auth; this codebase never touches raw passwords).
-- ---------------------------------------------------------------------------
create table if not exists account (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  issuer text,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists account_provider_account_idx
  on account (provider_id, account_id);
create index if not exists account_user_idx on account (user_id);

-- ---------------------------------------------------------------------------
-- verification: Better Auth email-verification / reset tokens.
-- ---------------------------------------------------------------------------
create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_identifier_idx on verification (identifier);

-- ---------------------------------------------------------------------------
-- profiles: public-facing marketplace profile (Phase 01, FR-2).
-- handle is the public URL identity (/profile/:handle), unique, lowercase.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists handle text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists timezone text;
alter table profiles add column if not exists skills jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists categories jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists portfolio_links jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists github_url text;
alter table profiles add column if not exists linkedin_url text;
alter table profiles add column if not exists website_url text;
alter table profiles add column if not exists availability text;
alter table profiles add column if not exists company_name text;
alter table profiles add column if not exists company_website text;
alter table profiles add column if not exists company_about text;
alter table profiles add column if not exists is_sponsor boolean not null default false;

create unique index if not exists profiles_handle_key on profiles (handle);