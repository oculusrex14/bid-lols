-- Culturebid board (site = 'culture') + bidception repositioned as marketing-platform discovery.
-- Reuses listings/orders/activity. Adds `values` jsonb for up to 5 culture points.

alter table listings drop constraint if exists listings_site_check;
alter table listings add constraint listings_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table orders drop constraint if exists orders_site_check;
alter table orders add constraint orders_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table activity drop constraint if exists activity_site_check;
alter table activity add constraint activity_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table site_stats drop constraint if exists site_stats_site_check;
alter table site_stats add constraint site_stats_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table listings add column if not exists values jsonb not null default '[]'::jsonb;

insert into site_stats (site, views, visits, visits_today, visits_day, launched_at, hype_locked)
values ('culture', 22100, 12880, 364, current_date, now(), false)
on conflict (site) do nothing;

insert into listings (
  id, site, url, url_key, title, tagline, team, values, bid_cents, clicks, swap_count, manage_token, last_bid_at, created_at
) values
('lst_cb_01', 'culture', 'https://kindred.work/culture', 'kindred.work/culture', 'Kindred Work',
 'Hire for taste. Teach the stack.',
 'We ship on Fridays and still make dinner.',
 '["Taste","Pace","Candor","Craft","Rest"]'::jsonb,
 980000, 2610, 0, 'mtcb01a7c9e2f14b8d0e6c3a1f5b7d9e0c2a4f81', now() - interval '9 minutes', now() - interval '12 days'),
('lst_cb_02', 'culture', 'https://shoreline.health/careers', 'shoreline.health/careers', 'Shoreline Health',
 'Clinicians who still write the docs.',
 'The on-call rota is public. So is the apology.',
 '["Patient first","Write it down","No heroics"]'::jsonb,
 720000, 1882, 0, 'mtcb02b1d4c8e03a9f7e2c5b0d8a6f1e3c7b9d2a', now() - interval '28 minutes', now() - interval '11 days'),
('lst_cb_03', 'culture', 'https://redwoodledger.com/why', 'redwoodledger.com/why', 'Redwood Ledger',
 'Finance people who answer Slack in sentences.',
 '',
 '["Clear books","No stealth","Apprenticeship"]'::jsonb,
 555000, 1410, 1, 'mtcb03c2e5d9f14b0a8e3d6c1f9b7a2e4d8c0b3f', now() - interval '1 hour', now() - interval '10 days'),
('lst_cb_04', 'culture', 'https://opencurrent.io/team', 'opencurrent.io/team', 'Open Current',
 'Energy software. Shop photos. Named crew.',
 'Everyone in the photo still works here.',
 '["Field days","Named owners","Slow hiring"]'::jsonb,
 410000, 990, 0, 'mtcb04d3f6e0a25c1b9f4e7d2a0c8b3f5e9d1c4a', now() - interval '3 hours', now() - interval '9 days'),
('lst_cb_05', 'culture', 'https://mapleandco.studio/culture', 'mapleandco.studio/culture', 'Maple & Co',
 'A four-person room that publishes how it works.',
 '',
 '["Four people","Published hours","No contractors as camouflage"]'::jsonb,
 320000, 720, 0, 'mtcb05e4a7f1b36d2c0a5f8e3b1d9c4a6f0e2d5b', now() - interval '5 hours', now() - interval '8 days'),
('lst_cb_06', 'culture', 'https://harborpeople.com/join', 'harborpeople.com/join', 'Harbor People',
 'Ops company. The handbook is the product.',
 'If it is not in the handbook it is not the job.',
 '["Handbook first","No surprise OKRs","PTO is real"]'::jsonb,
 250000, 610, 0, 'mtcb06f5b8a2c47e3d1b6a9f4c2e0d5b7a1f3e6c', now() - interval '8 hours', now() - interval '8 days'),
('lst_cb_07', 'culture', 'https://foldline.careers', 'foldline.careers', 'Foldline',
 'Paper, software, two cities, one cadence.',
 '',
 '["Two cities","Shared cadence","Support is founders too"]'::jsonb,
 180000, 404, 0, 'mtcb07a6c9b3d58f4e2c7b0a5d3f1e6c8b2a4f7d', now() - interval '11 hours', now() - interval '7 days'),
('lst_cb_08', 'culture', 'https://secondshift.co/culture', 'secondshift.co/culture', 'Second Shift',
 'Night-shift product. Named night crew.',
 'We do not pretend 9–5 is the only honest day.',
 '["Named nights","Async by default","No standup theatre"]'::jsonb,
 140000, 318, 1, 'mtcb08b7d0c4e69a5f3d8c1b6e4a2f7d9c3b5a8e', now() - interval '16 hours', now() - interval '7 days'),
('lst_cb_09', 'culture', 'https://glasswing.jobs', 'glasswing.jobs', 'Glasswing',
 'Brand studio. The people page is the homepage.',
 '',
 '["People on the homepage","Critique is kind","No unpaid tests"]'::jsonb,
 98000, 210, 0, 'mtcb09c8e1d5f70b6a4e9d2c7f5b3a8e0d4c6b9f', now() - interval '1 day', now() - interval '6 days'),
('lst_cb_10', 'culture', 'https://ironwood.build/people', 'ironwood.build/people', 'Ironwood Build',
 'Hardware. Shop hours on the careers page.',
 '',
 '["Shop hours","Apprentices","Tools with names"]'::jsonb,
 72000, 166, 0, 'mtcb10d9f2e6a81c7b5f0e3d8a6c4b9f1e5d7c0a', now() - interval '1 day 6 hours', now() - interval '5 days'),
('lst_cb_11', 'culture', 'https://quietbench.co/join', 'quietbench.co/join', 'Quiet Bench',
 'A studio that publishes who is in the room.',
 '',
 '["Small room","Published roster","Deep work mornings"]'::jsonb,
 54000, 121, 0, 'mtcb11e0a3f7b92d8c6a1f4e9b7d5c0a2f6e8d1b', now() - interval '2 days', now() - interval '5 days'),
('lst_cb_12', 'culture', 'https://copperyard.team', 'copperyard.team', 'Copperyard Kitchen',
 'Workshop company. Siblings, still on the floor.',
 '',
 '["Shop floor","Family names","No stealth kitchen"]'::jsonb,
 40000, 88, 0, 'mtcb12f1b4a8c03e9d7b2a5f0c8e6d1b3a7f9e2c', now() - interval '2 days 8 hours', now() - interval '4 days'),
('lst_cb_13', 'culture', 'https://palehire.press/masthead', 'palehire.press/masthead', 'Pale Hire Press',
 'Editors with names, not a culture deck.',
 '',
 '["Named editors","No deck","Lunch is on the calendar"]'::jsonb,
 28000, 64, 0, 'mtcb13a2c5b9d14f0e8c3b6a1d9f7e2c4b8a0f3d', now() - interval '3 days', now() - interval '4 days'),
('lst_cb_14', 'culture', 'https://smallhours.work/culture', 'smallhours.work/culture', 'Small Hours',
 'Night product. The crew is listed.',
 '',
 '["Listed crew","Night hours","No always-on"]'::jsonb,
 18000, 41, 0, 'mtcb14b3d6c0e25a1f9d4c7b2e0a8f3d5c9b1a4e', now() - interval '3 days 10 hours', now() - interval '3 days'),
('lst_cb_15', 'culture', 'https://mapleroom.jobs', 'mapleroom.jobs', 'Maple Room Jobs',
 'Four people in Toronto. The room has a door.',
 '',
 '["Four people","A door","No open-plan performance"]'::jsonb,
 9500, 22, 0, 'mtcb15c4e7d1f36b2a0e5d8c3f1b9a4e6d0c2b5f', now() - interval '4 days', now() - interval '3 days'),
('lst_cb_16', 'culture', 'https://firstchair.careers', 'firstchair.careers', 'First Chair',
 'Music tools. Instruments in the hiring photos.',
 '',
 '["Instruments in photos","Founders answer","No take-home overnight"]'::jsonb,
 6000, 14, 0, 'mtcb16d5f8e2a47c3b1f6e9d4a2c0b5f7e1d3c6a', now() - interval '5 days', now() - interval '2 days')
on conflict (id) do nothing;

-- Reposition existing bidception rows as marketing-platform discovery (same ids, new copy).
update listings set
  url = 'https://producthunt.com', url_key = 'producthunt.com',
  title = 'Product Hunt', tagline = 'Launch, then keep paying for the slot.',
  team = 'Launch directory'
where id = 'lst_bc_01';
update listings set
  url = 'https://paved.com', url_key = 'paved.com',
  title = 'Paved', tagline = 'Newsletter ads, one checkout.',
  team = 'Newsletter sponsorships'
where id = 'lst_bc_02';
update listings set
  url = 'https://betalist.com', url_key = 'betalist.com',
  title = 'BetaList', tagline = 'Early-stage directory. Paid bumps.',
  team = 'Startup directory'
where id = 'lst_bc_03';
update listings set
  url = 'https://g2.com', url_key = 'g2.com',
  title = 'G2', tagline = 'Reviews you can buy a better seat in.',
  team = 'Review platform'
where id = 'lst_bc_04';
update listings set
  url = 'https://capterra.com', url_key = 'capterra.com',
  title = 'Capterra', tagline = 'Category pages. Sponsored rows.',
  team = 'Software directory'
where id = 'lst_bc_05';
update listings set
  url = 'https://sparktoro.com', url_key = 'sparktoro.com',
  title = 'SparkToro', tagline = 'Audience research. Then you still have to place the ads.',
  team = 'Audience research'
where id = 'lst_bc_06';
update listings set
  url = 'https://buysellads.com', url_key = 'buysellads.com',
  title = 'BuySellAds', tagline = 'Independent ads. Independent sites.',
  team = 'Ad network'
where id = 'lst_bc_07';
update listings set
  url = 'https://carbonads.net', url_key = 'carbonads.net',
  title = 'Carbon Ads', tagline = 'One ad. Developer sites.',
  team = 'Developer ads'
where id = 'lst_bc_08';
update listings set
  url = 'https://saashub.com', url_key = 'saashub.com',
  title = 'SaaSHub', tagline = 'Alternatives, ranked, with a paid boost.',
  team = 'SaaS directory'
where id = 'lst_bc_09';
update listings set
  url = 'https://theresanaiforthat.com', url_key = 'theresanaiforthat.com',
  title = 'There''s An AI For That', tagline = 'AI directory. Featured slots.',
  team = 'AI directory'
where id = 'lst_bc_10';
update listings set
  url = 'https://alternativeto.net', url_key = 'alternativeto.net',
  title = 'AlternativeTo', tagline = 'The other-tool page everyone already opens.',
  team = 'Software alternatives'
where id = 'lst_bc_11';
update listings set
  url = 'https://indiehackers.com', url_key = 'indiehackers.com',
  title = 'Indie Hackers', tagline = 'Community, plus the paid slots around it.',
  team = 'Builder community'
where id = 'lst_bc_12';
update listings set
  url = 'https://launchingnext.com', url_key = 'launchingnext.com',
  title = 'Launching Next', tagline = 'Weekly launch list. Paid featured.',
  team = 'Launch list'
where id = 'lst_bc_13';
update listings set
  url = 'https://crunchbase.com', url_key = 'crunchbase.com',
  title = 'Crunchbase', tagline = 'Company graph. Pro seats.',
  team = 'Company data'
where id = 'lst_bc_14';
update listings set
  url = 'https://passionfroot.me', url_key = 'passionfroot.me',
  title = 'Passionfroot', tagline = 'Creator sponsorships, leftover budget welcome.',
  team = 'Creator marketplace'
where id = 'lst_bc_15';
update listings set
  url = 'https://similarweb.com', url_key = 'similarweb.com',
  title = 'Similarweb', tagline = 'Traffic intel. Then you pick the next board.',
  team = 'Traffic intel'
where id = 'lst_bc_16';
update listings set
  url = 'https://sourceforge.net', url_key = 'sourceforge.net',
  title = 'SourceForge', tagline = 'Old directory. Still selling the top row.',
  team = 'Software directory'
where id = 'lst_bc_17';
update listings set
  url = 'https://getlatka.com', url_key = 'getlatka.com',
  title = 'GetLatka', tagline = 'SaaS numbers. Sponsored profiles.',
  team = 'SaaS data'
where id = 'lst_bc_18';
update listings set
  url = 'https://newsletterads.lol', url_key = 'newsletterads.lol',
  title = 'Newsletterads.lol', tagline = 'A board of newsletter sponsorship slots.',
  team = 'Newsletter board'
where id = 'lst_bc_19';
update listings set
  url = 'https://communityboards.lol', url_key = 'communityboards.lol',
  title = 'Communityboards.lol', tagline = 'Pay to pin in independent communities.',
  team = 'Community pins'
where id = 'lst_bc_20';
