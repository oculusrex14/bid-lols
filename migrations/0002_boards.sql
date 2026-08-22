create table if not exists listings (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  url text not null,
  url_key text not null,
  title text not null,
  tagline text not null default '',
  team text not null default '',
  bid_cents integer not null default 0,
  rank integer,
  clicks integer not null default 0,
  swap_count integer not null default 0,
  manage_token text not null unique,
  created_at timestamptz not null default now(),
  last_bid_at timestamptz not null default now(),
  unique (site, url_key)
);

create index if not exists listings_site_bid_idx on listings (site, bid_cents desc);
create index if not exists listings_site_rank_idx on listings (site, rank);

create table if not exists orders (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  kind text not null check (kind in ('bid', 'swap')),
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  listing_id text,
  manage_token text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_status_idx on orders (status);

create table if not exists activity (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  listing_id text,
  kind text not null check (kind in ('bid', 'rebid', 'swap', 'click')),
  amount_cents integer,
  rank_to integer,
  title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_site_created_idx on activity (site, created_at desc);

insert into listings (
  id, site, url, url_key, title, tagline, team, bid_cents, clicks, swap_count, manage_token, last_bid_at, created_at
) values
('lst_fb_01', 'founders', 'https://northstarlabs.com/team', 'northstarlabs.com/team', 'Northstar Labs', 'Three people. One product. No deck.', 'Amira Chen · Jonas Veld · Priya Shah', 1240000, 4180, 1, 'mtfb01a7c9e2f14b8d0e6c3a1f5b7d9e0c2a4f81', now() - interval '11 minutes', now() - interval '14 days'),
('lst_fb_02', 'founders', 'https://aperture.studio/about', 'aperture.studio/about', 'Aperture Studio', 'Design founders who still ship Fridays.', 'Leo Park · Sana Idris', 820000, 2910, 0, 'mtfb02b1d4c8e03a9f7e2c5b0d8a6f1e3c7b9d2a', now() - interval '38 minutes', now() - interval '13 days'),
('lst_fb_03', 'founders', 'https://kiteandco.com/founders', 'kiteandco.com/founders', 'Kite & Co', 'The original three still answer support.', 'Maya Kite · Owen Hale · Rui Tan', 555000, 1888, 0, 'mtfb03c2e5d9f14b0a8e3d6c1f9b7a2e4d8c0b3f', now() - interval '2 hours', now() - interval '12 days'),
('lst_fb_04', 'founders', 'https://lumenfounders.com', 'lumenfounders.com', 'Lumen', 'A lighting company with a public cap table.', 'Noah Ellison · Tess Okada', 410000, 1640, 1, 'mtfb04d3f6e0a25c1b9f4e7d2a0c8b3f5e9d1c4a', now() - interval '3 hours', now() - interval '11 days'),
('lst_fb_05', 'founders', 'https://harborprotocol.xyz/team', 'harborprotocol.xyz/team', 'Harbor Protocol', 'Ex-exchange engineers. Named. Photoed.', 'Ibrahim Noor · Claire Voss · Kenji Abe', 320000, 1422, 0, 'mtfb05e4a7f1b36d2c0a5f8e3b1d9c4a6f0e2d5b', now() - interval '5 hours', now() - interval '10 days'),
('lst_fb_06', 'founders', 'https://vesper.club/about', 'vesper.club/about', 'Vesper Club', 'Members can see who actually runs it.', 'Helena Ruiz', 250000, 980, 0, 'mtfb06f5b8a2c47e3d1b6a9f4c2e0d5b7a1f3e6c', now() - interval '7 hours', now() - interval '9 days'),
('lst_fb_07', 'founders', 'https://foldline.io/team', 'foldline.io/team', 'Foldline', 'Paper, software, two founders, one city.', 'Chris Lang · Yuna Choi', 180000, 870, 2, 'mtfb07a6c9b3d58f4e2c7b0a5d3f1e6c8b2a4f7d', now() - interval '9 hours', now() - interval '8 days'),
('lst_fb_08', 'founders', 'https://secondform.co/founders', 'secondform.co/founders', 'Second Form', 'We rebuilt the company in public.', 'Ada Moreau · Farid Qureshi', 140000, 640, 0, 'mtfb08b7d0c4e69a5f3d8c1b6e4a2f7d9c3b5a8e', now() - interval '14 hours', now() - interval '8 days'),
('lst_fb_09', 'founders', 'https://palefire.press/masthead', 'palefire.press/masthead', 'Pale Fire Press', 'Editors with names, not a masthead void.', 'Ruth Adler · Tom Weller', 98000, 510, 0, 'mtfb09c8e1d5f70b6a4e9d2c7f5b3a8e0d4c6b9f', now() - interval '18 hours', now() - interval '7 days'),
('lst_fb_10', 'founders', 'https://ironwood.build/about', 'ironwood.build/about', 'Ironwood', 'Hardware founders. Shop photos. Real hours.', 'Gabe Nilsen · Maren Holt', 72000, 402, 0, 'mtfb10d9f2e6a81c7b5f0e3d8a6c4b9f1e5d7c0a', now() - interval '22 hours', now() - interval '6 days'),
('lst_fb_11', 'founders', 'https://quietwork.co', 'quietwork.co', 'Quiet Work', 'A studio that publishes who is in the room.', 'Elena Vos', 54000, 333, 1, 'mtfb11e0a3f7b92d8c6a1f4e9b7d5c0a2f6e8d1b', now() - interval '1 day', now() - interval '6 days'),
('lst_fb_12', 'founders', 'https://fieldnote.app/team', 'fieldnote.app/team', 'Fieldnote', 'Two PMs who got tired of the deck.', 'Samir Patel · June Oka', 40000, 281, 0, 'mtfb12f1b4a8c03e9d7b2a5f0c8e6d1b3a7f9e2c', now() - interval '1 day 4 hours', now() - interval '5 days'),
('lst_fb_13', 'founders', 'https://glasswing.design/people', 'glasswing.design/people', 'Glasswing', 'Brand studio. Founders on the homepage.', 'Ines Costa · Paul Nye', 28000, 190, 0, 'mtfb13a2c5b9d14f0e8c3b6a1d9f7e2c4b8a0f3d', now() - interval '2 days', now() - interval '5 days'),
('lst_fb_14', 'founders', 'https://copperyard.com/about', 'copperyard.com/about', 'Copperyard', 'Kitchenware, three siblings, one workshop.', 'The Hale siblings', 18000, 144, 0, 'mtfb14b3d6c0e25a1f9d4c7b2e0a8f3d5c9b1a4e', now() - interval '2 days 6 hours', now() - interval '4 days'),
('lst_fb_15', 'founders', 'https://smallhours.studio', 'smallhours.studio', 'Small Hours', 'Night-shift product studio. Named night crew.', 'Rafi Mendel', 9500, 96, 0, 'mtfb15c4e7d1f36b2a0e5d8c3f1b9a4e6d0c2b5f', now() - interval '3 days', now() - interval '4 days'),
('lst_fb_16', 'founders', 'https://redthread.works/about', 'redthread.works/about', 'Redthread', 'Strategy pair. Both on the about page.', 'Nina Sol · Mark Edev', 6000, 71, 0, 'mtfb16d5f8e2a47c3b1f6e9d4a2c0b5f7e1d3c6a', now() - interval '3 days 8 hours', now() - interval '3 days'),
('lst_fb_17', 'founders', 'https://mapleroom.co/team', 'mapleroom.co/team', 'Maple Room', 'A four-person room in Toronto.', 'The Maple Room', 2500, 40, 0, 'mtfb17e6a9f3b58d4c2a7f0e5b3d1c6a8f2e4d7b', now() - interval '4 days', now() - interval '3 days'),
('lst_fb_18', 'founders', 'https://firstchair.io/founders', 'firstchair.io/founders', 'First Chair', 'Music-tools founders, instruments in the photos.', 'Otto Berg', 1200, 22, 0, 'mtfb18f7b0a4c69e5d3b8a1f6c4e2d7b9a3f5e8c', now() - interval '5 days', now() - interval '2 days'),
('lst_fb_19', 'founders', 'https://origamidesk.com/about', 'origamidesk.com/about', 'Origami Desk', 'One founder. One product. Folded daily.', 'Mina Cho', 800, 14, 0, 'mtfb19a8c1b5d70f6e4c9b2a7d5f3e8c0b4a6f9d', now() - interval '6 days', now() - interval '2 days'),
('lst_fb_20', 'founders', 'https://seedandsignal.com', 'seedandsignal.com', 'Seed & Signal', 'Pre-seed, names public, no stealth.', 'Jonah Reed · Alia Nour', 500, 9, 0, 'mtfb20b9d2c6e81a7f5d0c3b8e6a4f9d1c5b7a0e', now() - interval '6 days 12 hours', now() - interval '1 day'),
('lst_bc_01', 'bidception', 'https://outbid.lol', 'outbid.lol', 'Outbid.lol', 'The original. Still collecting rent.', 'Pay-to-rank original', 1860000, 9204, 1, 'mtbc01a1c3e5f709b2d4e6a8c0f1b3d5e7a9c2f4', now() - interval '6 minutes', now() - interval '20 days'),
('lst_bc_02', 'bidception', 'https://bidwar.lol', 'bidwar.lol', 'Bidwar.lol', 'Faster refresh. Same mechanic.', 'Clone with a war room', 940000, 4102, 0, 'mtbc02b2d4f6a81c3e5f7b9d1a2c4e6f8b0d3a5', now() - interval '22 minutes', now() - interval '18 days'),
('lst_bc_03', 'bidception', 'https://rankstack.lol', 'rankstack.lol', 'Rankstack.lol', 'Stacked bids. Nested fees.', 'Meta-adjacent clone', 710000, 3011, 0, 'mtbc03c3e5a7b92d4f6a8c0e1b3d5f7a9c1e4b6', now() - interval '41 minutes', now() - interval '16 days'),
('lst_bc_04', 'bidception', 'https://paytorank.lol', 'paytorank.lol', 'Paytorank.lol', 'The name is the pitch.', 'Literalist board', 540000, 2440, 2, 'mtbc04d4f6b8c03e5a7d9e1f2c4e6a8b0d2f5c7', now() - interval '1 hour', now() - interval '15 days'),
('lst_bc_05', 'bidception', 'https://leaderbid.lol', 'leaderbid.lol', 'Leaderbid.lol', 'A board for boards that lead.', 'Generalist .lol', 390000, 1888, 0, 'mtbc05e5a7c9d14f6b8e0f2a3d5f7b9c1e3a6d8', now() - interval '2 hours', now() - interval '14 days'),
('lst_bc_06', 'bidception', 'https://topbid.lol', 'topbid.lol', 'Topbid.lol', 'Only the top slot is marketed.', 'Single-slot clone', 280000, 1320, 0, 'mtbc06f6b8d0e25a7c9f1a3b4e6a8c0d2f4b7e9', now() - interval '4 hours', now() - interval '13 days'),
('lst_bc_07', 'bidception', 'https://cloutbid.lol', 'cloutbid.lol', 'Cloutbid.lol', 'Influencers bidding on influencers.', 'Creator board', 210000, 1104, 1, 'mtbc07a7c9e1f36b8d0a2b4c5f7b9d1e3a5c8f0', now() - interval '6 hours', now() - interval '12 days'),
('lst_bc_08', 'bidception', 'https://auctionboard.lol', 'auctionboard.lol', 'Auctionboard.lol', 'Ascending bids, descending dignity.', 'Classic auction skin', 160000, 870, 0, 'mtbc08b8d0f2a47c9e1b3c5d6a8c0e2f4b6d9a1', now() - interval '8 hours', now() - interval '11 days'),
('lst_bc_09', 'bidception', 'https://bidroom.lol', 'bidroom.lol', 'Bidroom.lol', 'A quieter room. Same dollars.', 'Minimal clone', 120000, 654, 0, 'mtbc09c9e1a3b58d0f2c4d6e7b9d1f3a5c7e0b2', now() - interval '11 hours', now() - interval '10 days'),
('lst_bc_10', 'bidception', 'https://rankpay.lol', 'rankpay.lol', 'Rankpay.lol', 'Pay the rank. Skip the story.', 'Utility board', 88000, 501, 0, 'mtbc10d0f2b4c69e1a3d5e7f8c0e2a4b6d8f1c3', now() - interval '16 hours', now() - interval '9 days'),
('lst_bc_11', 'bidception', 'https://firstplace.lol', 'firstplace.lol', 'Firstplace.lol', 'Obsessed with slot one.', 'Crown hunter', 64000, 388, 0, 'mtbc11e1a3c5d70f2b4e6f8a9d1f3b5c7e9a2d4', now() - interval '20 hours', now() - interval '8 days'),
('lst_bc_12', 'bidception', 'https://overbid.lol', 'overbid.lol', 'Overbid.lol', 'Always one dollar more.', 'Incrementalist', 48000, 290, 1, 'mtbc12f2b4d6e81a3c5f7a9b0e2a4c6d8f0b3e5', now() - interval '1 day', now() - interval '7 days'),
('lst_bc_13', 'bidception', 'https://boardwars.lol', 'boardwars.lol', 'Boardwars.lol', 'Boards fighting boards.', 'Combat framing', 31000, 210, 0, 'mtbc13a3c5e7f92b4d6a8b0c1f3b5d7e9a1c4f6', now() - interval '1 day 8 hours', now() - interval '7 days'),
('lst_bc_14', 'bidception', 'https://slotbid.lol', 'slotbid.lol', 'Slotbid.lol', 'Rent the slot. Keep the URL.', 'Slot rental', 22000, 166, 0, 'mtbc14b4d6f8a03c5e7b9c1d2a4c6e8f0b2d5a7', now() - interval '2 days', now() - interval '6 days'),
('lst_bc_15', 'bidception', 'https://climb.lol', 'climb.lol', 'Climb.lol', 'A ladder with a card reader.', 'Progress skin', 14000, 121, 0, 'mtbc15c5e7a9b14d6f8c0d2e3b5d7f9a1c3e6b8', now() - interval '2 days 10 hours', now() - interval '5 days'),
('lst_bc_16', 'bidception', 'https://bidlist.lol', 'bidlist.lol', 'Bidlist.lol', 'A list that costs money to climb.', 'Directory clone', 9000, 88, 0, 'mtbc16d6f8b0c25e7a9d1e3f4c6e8a0b2d4f7c9', now() - interval '3 days', now() - interval '5 days'),
('lst_bc_17', 'bidception', 'https://higher.lol', 'higher.lol', 'Higher.lol', 'The entire brand is an adverb.', 'One-word domain', 5500, 61, 0, 'mtbc17e7a9c1d36f8b0e2f4a5d7f9b1c3e5a8d0', now() - interval '3 days 6 hours', now() - interval '4 days'),
('lst_bc_18', 'bidception', 'https://paywallboard.lol', 'paywallboard.lol', 'Paywallboard.lol', 'The feed is the paywall.', 'Honest naming', 3000, 40, 0, 'mtbc18f8b0d2e47a9c1f3a5b6e8a0c2d4f6b9e1', now() - interval '4 days', now() - interval '3 days'),
('lst_bc_19', 'bidception', 'https://lastbid.lol', 'lastbid.lol', 'Lastbid.lol', 'Always almost first.', 'Runner-up club', 1500, 19, 0, 'mtbc19a9c1e3f58b0d2a4b6c7f9b1d3e5a7c0f2', now() - interval '5 days', now() - interval '2 days'),
('lst_bc_20', 'bidception', 'https://underdog.lol', 'underdog.lol', 'Underdog.lol', 'Five dollars. Ambition intact.', 'Floor sitter', 500, 7, 0, 'mtbc20b0d2f4a69c1e3b5c7d8a0c2e4f6b8d1a3', now() - interval '6 days', now() - interval '1 day')
on conflict do nothing;

with ranked as (
  select id, row_number() over (partition by site order by bid_cents desc, last_bid_at asc, id asc) as r
  from listings
  where bid_cents > 0
)
update listings l set rank = ranked.r from ranked where l.id = ranked.id;

insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title, created_at) values
('act_fb_01', 'founders', 'lst_fb_01', 'rebid', 40000, 1, 'Northstar Labs', now() - interval '11 minutes'),
('act_fb_02', 'founders', 'lst_fb_02', 'rebid', 20000, 2, 'Aperture Studio', now() - interval '38 minutes'),
('act_fb_03', 'founders', 'lst_fb_03', 'bid', 555000, 3, 'Kite & Co', now() - interval '2 hours'),
('act_fb_04', 'founders', 'lst_fb_07', 'swap', 36000, 7, 'Foldline', now() - interval '9 hours'),
('act_fb_05', 'founders', 'lst_fb_04', 'rebid', 10000, 4, 'Lumen', now() - interval '3 hours'),
('act_fb_06', 'founders', 'lst_fb_15', 'bid', 9500, 15, 'Small Hours', now() - interval '3 days'),
('act_fb_07', 'founders', 'lst_fb_01', 'bid', 1200000, 1, 'Northstar Labs', now() - interval '2 days'),
('act_fb_08', 'founders', 'lst_fb_20', 'bid', 500, 20, 'Seed & Signal', now() - interval '6 days 12 hours'),
('act_bc_01', 'bidception', 'lst_bc_01', 'rebid', 60000, 1, 'Outbid.lol', now() - interval '6 minutes'),
('act_bc_02', 'bidception', 'lst_bc_02', 'rebid', 15000, 2, 'Bidwar.lol', now() - interval '22 minutes'),
('act_bc_03', 'bidception', 'lst_bc_03', 'bid', 710000, 3, 'Rankstack.lol', now() - interval '41 minutes'),
('act_bc_04', 'bidception', 'lst_bc_04', 'swap', 108000, 4, 'Paytorank.lol', now() - interval '1 hour'),
('act_bc_05', 'bidception', 'lst_bc_05', 'rebid', 20000, 5, 'Leaderbid.lol', now() - interval '2 hours'),
('act_bc_06', 'bidception', 'lst_bc_20', 'bid', 500, 20, 'Underdog.lol', now() - interval '6 days'),
('act_bc_07', 'bidception', 'lst_bc_01', 'bid', 1800000, 1, 'Outbid.lol', now() - interval '4 days'),
('act_bc_08', 'bidception', 'lst_bc_12', 'swap', 4800, 12, 'Overbid.lol', now() - interval '1 day')
on conflict do nothing;
