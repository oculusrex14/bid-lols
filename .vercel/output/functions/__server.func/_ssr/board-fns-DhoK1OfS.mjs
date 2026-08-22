import { i as quoteSwapFee, r as isSiteId } from "./sites-DQ1RC7LF.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as string, i as object, r as number, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/board-fns-DhoK1OfS.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var _0002_boards_default = "create table if not exists listings (\n  id text primary key,\n  site text not null check (site in ('founders', 'bidception')),\n  url text not null,\n  url_key text not null,\n  title text not null,\n  tagline text not null default '',\n  team text not null default '',\n  bid_cents integer not null default 0,\n  rank integer,\n  clicks integer not null default 0,\n  swap_count integer not null default 0,\n  manage_token text not null unique,\n  created_at timestamptz not null default now(),\n  last_bid_at timestamptz not null default now(),\n  unique (site, url_key)\n);\n\ncreate index if not exists listings_site_bid_idx on listings (site, bid_cents desc);\ncreate index if not exists listings_site_rank_idx on listings (site, rank);\n\ncreate table if not exists orders (\n  id text primary key,\n  site text not null check (site in ('founders', 'bidception')),\n  kind text not null check (kind in ('bid', 'swap')),\n  amount_cents integer not null,\n  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),\n  listing_id text,\n  manage_token text,\n  payload jsonb not null default '{}'::jsonb,\n  created_at timestamptz not null default now(),\n  paid_at timestamptz\n);\n\ncreate index if not exists orders_status_idx on orders (status);\n\ncreate table if not exists activity (\n  id text primary key,\n  site text not null check (site in ('founders', 'bidception')),\n  listing_id text,\n  kind text not null check (kind in ('bid', 'rebid', 'swap', 'click')),\n  amount_cents integer,\n  rank_to integer,\n  title text not null default '',\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists activity_site_created_idx on activity (site, created_at desc);\n\ninsert into listings (\n  id, site, url, url_key, title, tagline, team, bid_cents, clicks, swap_count, manage_token, last_bid_at, created_at\n) values\n('lst_fb_01', 'founders', 'https://northstarlabs.com/team', 'northstarlabs.com/team', 'Northstar Labs', 'Three people. One product. No deck.', 'Amira Chen · Jonas Veld · Priya Shah', 1240000, 4180, 1, 'mtfb01a7c9e2f14b8d0e6c3a1f5b7d9e0c2a4f81', now() - interval '11 minutes', now() - interval '14 days'),\n('lst_fb_02', 'founders', 'https://aperture.studio/about', 'aperture.studio/about', 'Aperture Studio', 'Design founders who still ship Fridays.', 'Leo Park · Sana Idris', 820000, 2910, 0, 'mtfb02b1d4c8e03a9f7e2c5b0d8a6f1e3c7b9d2a', now() - interval '38 minutes', now() - interval '13 days'),\n('lst_fb_03', 'founders', 'https://kiteandco.com/founders', 'kiteandco.com/founders', 'Kite & Co', 'The original three still answer support.', 'Maya Kite · Owen Hale · Rui Tan', 555000, 1888, 0, 'mtfb03c2e5d9f14b0a8e3d6c1f9b7a2e4d8c0b3f', now() - interval '2 hours', now() - interval '12 days'),\n('lst_fb_04', 'founders', 'https://lumenfounders.com', 'lumenfounders.com', 'Lumen', 'A lighting company with a public cap table.', 'Noah Ellison · Tess Okada', 410000, 1640, 1, 'mtfb04d3f6e0a25c1b9f4e7d2a0c8b3f5e9d1c4a', now() - interval '3 hours', now() - interval '11 days'),\n('lst_fb_05', 'founders', 'https://harborprotocol.xyz/team', 'harborprotocol.xyz/team', 'Harbor Protocol', 'Ex-exchange engineers. Named. Photoed.', 'Ibrahim Noor · Claire Voss · Kenji Abe', 320000, 1422, 0, 'mtfb05e4a7f1b36d2c0a5f8e3b1d9c4a6f0e2d5b', now() - interval '5 hours', now() - interval '10 days'),\n('lst_fb_06', 'founders', 'https://vesper.club/about', 'vesper.club/about', 'Vesper Club', 'Members can see who actually runs it.', 'Helena Ruiz', 250000, 980, 0, 'mtfb06f5b8a2c47e3d1b6a9f4c2e0d5b7a1f3e6c', now() - interval '7 hours', now() - interval '9 days'),\n('lst_fb_07', 'founders', 'https://foldline.io/team', 'foldline.io/team', 'Foldline', 'Paper, software, two founders, one city.', 'Chris Lang · Yuna Choi', 180000, 870, 2, 'mtfb07a6c9b3d58f4e2c7b0a5d3f1e6c8b2a4f7d', now() - interval '9 hours', now() - interval '8 days'),\n('lst_fb_08', 'founders', 'https://secondform.co/founders', 'secondform.co/founders', 'Second Form', 'We rebuilt the company in public.', 'Ada Moreau · Farid Qureshi', 140000, 640, 0, 'mtfb08b7d0c4e69a5f3d8c1b6e4a2f7d9c3b5a8e', now() - interval '14 hours', now() - interval '8 days'),\n('lst_fb_09', 'founders', 'https://palefire.press/masthead', 'palefire.press/masthead', 'Pale Fire Press', 'Editors with names, not a masthead void.', 'Ruth Adler · Tom Weller', 98000, 510, 0, 'mtfb09c8e1d5f70b6a4e9d2c7f5b3a8e0d4c6b9f', now() - interval '18 hours', now() - interval '7 days'),\n('lst_fb_10', 'founders', 'https://ironwood.build/about', 'ironwood.build/about', 'Ironwood', 'Hardware founders. Shop photos. Real hours.', 'Gabe Nilsen · Maren Holt', 72000, 402, 0, 'mtfb10d9f2e6a81c7b5f0e3d8a6c4b9f1e5d7c0a', now() - interval '22 hours', now() - interval '6 days'),\n('lst_fb_11', 'founders', 'https://quietwork.co', 'quietwork.co', 'Quiet Work', 'A studio that publishes who is in the room.', 'Elena Vos', 54000, 333, 1, 'mtfb11e0a3f7b92d8c6a1f4e9b7d5c0a2f6e8d1b', now() - interval '1 day', now() - interval '6 days'),\n('lst_fb_12', 'founders', 'https://fieldnote.app/team', 'fieldnote.app/team', 'Fieldnote', 'Two PMs who got tired of the deck.', 'Samir Patel · June Oka', 40000, 281, 0, 'mtfb12f1b4a8c03e9d7b2a5f0c8e6d1b3a7f9e2c', now() - interval '1 day 4 hours', now() - interval '5 days'),\n('lst_fb_13', 'founders', 'https://glasswing.design/people', 'glasswing.design/people', 'Glasswing', 'Brand studio. Founders on the homepage.', 'Ines Costa · Paul Nye', 28000, 190, 0, 'mtfb13a2c5b9d14f0e8c3b6a1d9f7e2c4b8a0f3d', now() - interval '2 days', now() - interval '5 days'),\n('lst_fb_14', 'founders', 'https://copperyard.com/about', 'copperyard.com/about', 'Copperyard', 'Kitchenware, three siblings, one workshop.', 'The Hale siblings', 18000, 144, 0, 'mtfb14b3d6c0e25a1f9d4c7b2e0a8f3d5c9b1a4e', now() - interval '2 days 6 hours', now() - interval '4 days'),\n('lst_fb_15', 'founders', 'https://smallhours.studio', 'smallhours.studio', 'Small Hours', 'Night-shift product studio. Named night crew.', 'Rafi Mendel', 9500, 96, 0, 'mtfb15c4e7d1f36b2a0e5d8c3f1b9a4e6d0c2b5f', now() - interval '3 days', now() - interval '4 days'),\n('lst_fb_16', 'founders', 'https://redthread.works/about', 'redthread.works/about', 'Redthread', 'Strategy pair. Both on the about page.', 'Nina Sol · Mark Edev', 6000, 71, 0, 'mtfb16d5f8e2a47c3b1f6e9d4a2c0b5f7e1d3c6a', now() - interval '3 days 8 hours', now() - interval '3 days'),\n('lst_fb_17', 'founders', 'https://mapleroom.co/team', 'mapleroom.co/team', 'Maple Room', 'A four-person room in Toronto.', 'The Maple Room', 2500, 40, 0, 'mtfb17e6a9f3b58d4c2a7f0e5b3d1c6a8f2e4d7b', now() - interval '4 days', now() - interval '3 days'),\n('lst_fb_18', 'founders', 'https://firstchair.io/founders', 'firstchair.io/founders', 'First Chair', 'Music-tools founders, instruments in the photos.', 'Otto Berg', 1200, 22, 0, 'mtfb18f7b0a4c69e5d3b8a1f6c4e2d7b9a3f5e8c', now() - interval '5 days', now() - interval '2 days'),\n('lst_fb_19', 'founders', 'https://origamidesk.com/about', 'origamidesk.com/about', 'Origami Desk', 'One founder. One product. Folded daily.', 'Mina Cho', 800, 14, 0, 'mtfb19a8c1b5d70f6e4c9b2a7d5f3e8c0b4a6f9d', now() - interval '6 days', now() - interval '2 days'),\n('lst_fb_20', 'founders', 'https://seedandsignal.com', 'seedandsignal.com', 'Seed & Signal', 'Pre-seed, names public, no stealth.', 'Jonah Reed · Alia Nour', 500, 9, 0, 'mtfb20b9d2c6e81a7f5d0c3b8e6a4f9d1c5b7a0e', now() - interval '6 days 12 hours', now() - interval '1 day'),\n('lst_bc_01', 'bidception', 'https://outbid.lol', 'outbid.lol', 'Outbid.lol', 'The original. Still collecting rent.', 'Pay-to-rank original', 1860000, 9204, 1, 'mtbc01a1c3e5f709b2d4e6a8c0f1b3d5e7a9c2f4', now() - interval '6 minutes', now() - interval '20 days'),\n('lst_bc_02', 'bidception', 'https://bidwar.lol', 'bidwar.lol', 'Bidwar.lol', 'Faster refresh. Same mechanic.', 'Clone with a war room', 940000, 4102, 0, 'mtbc02b2d4f6a81c3e5f7b9d1a2c4e6f8b0d3a5', now() - interval '22 minutes', now() - interval '18 days'),\n('lst_bc_03', 'bidception', 'https://rankstack.lol', 'rankstack.lol', 'Rankstack.lol', 'Stacked bids. Nested fees.', 'Meta-adjacent clone', 710000, 3011, 0, 'mtbc03c3e5a7b92d4f6a8c0e1b3d5f7a9c1e4b6', now() - interval '41 minutes', now() - interval '16 days'),\n('lst_bc_04', 'bidception', 'https://paytorank.lol', 'paytorank.lol', 'Paytorank.lol', 'The name is the pitch.', 'Literalist board', 540000, 2440, 2, 'mtbc04d4f6b8c03e5a7d9e1f2c4e6a8b0d2f5c7', now() - interval '1 hour', now() - interval '15 days'),\n('lst_bc_05', 'bidception', 'https://leaderbid.lol', 'leaderbid.lol', 'Leaderbid.lol', 'A board for boards that lead.', 'Generalist .lol', 390000, 1888, 0, 'mtbc05e5a7c9d14f6b8e0f2a3d5f7b9c1e3a6d8', now() - interval '2 hours', now() - interval '14 days'),\n('lst_bc_06', 'bidception', 'https://topbid.lol', 'topbid.lol', 'Topbid.lol', 'Only the top slot is marketed.', 'Single-slot clone', 280000, 1320, 0, 'mtbc06f6b8d0e25a7c9f1a3b4e6a8c0d2f4b7e9', now() - interval '4 hours', now() - interval '13 days'),\n('lst_bc_07', 'bidception', 'https://cloutbid.lol', 'cloutbid.lol', 'Cloutbid.lol', 'Influencers bidding on influencers.', 'Creator board', 210000, 1104, 1, 'mtbc07a7c9e1f36b8d0a2b4c5f7b9d1e3a5c8f0', now() - interval '6 hours', now() - interval '12 days'),\n('lst_bc_08', 'bidception', 'https://auctionboard.lol', 'auctionboard.lol', 'Auctionboard.lol', 'Ascending bids, descending dignity.', 'Classic auction skin', 160000, 870, 0, 'mtbc08b8d0f2a47c9e1b3c5d6a8c0e2f4b6d9a1', now() - interval '8 hours', now() - interval '11 days'),\n('lst_bc_09', 'bidception', 'https://bidroom.lol', 'bidroom.lol', 'Bidroom.lol', 'A quieter room. Same dollars.', 'Minimal clone', 120000, 654, 0, 'mtbc09c9e1a3b58d0f2c4d6e7b9d1f3a5c7e0b2', now() - interval '11 hours', now() - interval '10 days'),\n('lst_bc_10', 'bidception', 'https://rankpay.lol', 'rankpay.lol', 'Rankpay.lol', 'Pay the rank. Skip the story.', 'Utility board', 88000, 501, 0, 'mtbc10d0f2b4c69e1a3d5e7f8c0e2a4b6d8f1c3', now() - interval '16 hours', now() - interval '9 days'),\n('lst_bc_11', 'bidception', 'https://firstplace.lol', 'firstplace.lol', 'Firstplace.lol', 'Obsessed with slot one.', 'Crown hunter', 64000, 388, 0, 'mtbc11e1a3c5d70f2b4e6f8a9d1f3b5c7e9a2d4', now() - interval '20 hours', now() - interval '8 days'),\n('lst_bc_12', 'bidception', 'https://overbid.lol', 'overbid.lol', 'Overbid.lol', 'Always one dollar more.', 'Incrementalist', 48000, 290, 1, 'mtbc12f2b4d6e81a3c5f7a9b0e2a4c6d8f0b3e5', now() - interval '1 day', now() - interval '7 days'),\n('lst_bc_13', 'bidception', 'https://boardwars.lol', 'boardwars.lol', 'Boardwars.lol', 'Boards fighting boards.', 'Combat framing', 31000, 210, 0, 'mtbc13a3c5e7f92b4d6a8b0c1f3b5d7e9a1c4f6', now() - interval '1 day 8 hours', now() - interval '7 days'),\n('lst_bc_14', 'bidception', 'https://slotbid.lol', 'slotbid.lol', 'Slotbid.lol', 'Rent the slot. Keep the URL.', 'Slot rental', 22000, 166, 0, 'mtbc14b4d6f8a03c5e7b9c1d2a4c6e8f0b2d5a7', now() - interval '2 days', now() - interval '6 days'),\n('lst_bc_15', 'bidception', 'https://climb.lol', 'climb.lol', 'Climb.lol', 'A ladder with a card reader.', 'Progress skin', 14000, 121, 0, 'mtbc15c5e7a9b14d6f8c0d2e3b5d7f9a1c3e6b8', now() - interval '2 days 10 hours', now() - interval '5 days'),\n('lst_bc_16', 'bidception', 'https://bidlist.lol', 'bidlist.lol', 'Bidlist.lol', 'A list that costs money to climb.', 'Directory clone', 9000, 88, 0, 'mtbc16d6f8b0c25e7a9d1e3f4c6e8a0b2d4f7c9', now() - interval '3 days', now() - interval '5 days'),\n('lst_bc_17', 'bidception', 'https://higher.lol', 'higher.lol', 'Higher.lol', 'The entire brand is an adverb.', 'One-word domain', 5500, 61, 0, 'mtbc17e7a9c1d36f8b0e2f4a5d7f9b1c3e5a8d0', now() - interval '3 days 6 hours', now() - interval '4 days'),\n('lst_bc_18', 'bidception', 'https://paywallboard.lol', 'paywallboard.lol', 'Paywallboard.lol', 'The feed is the paywall.', 'Honest naming', 3000, 40, 0, 'mtbc18f8b0d2e47a9c1f3a5b6e8a0c2d4f6b9e1', now() - interval '4 days', now() - interval '3 days'),\n('lst_bc_19', 'bidception', 'https://lastbid.lol', 'lastbid.lol', 'Lastbid.lol', 'Always almost first.', 'Runner-up club', 1500, 19, 0, 'mtbc19a9c1e3f58b0d2a4b6c7f9b1d3e5a7c0f2', now() - interval '5 days', now() - interval '2 days'),\n('lst_bc_20', 'bidception', 'https://underdog.lol', 'underdog.lol', 'Underdog.lol', 'Five dollars. Ambition intact.', 'Floor sitter', 500, 7, 0, 'mtbc20b0d2f4a69c1e3b5c7d8a0c2e4f6b8d1a3', now() - interval '6 days', now() - interval '1 day')\non conflict do nothing;\n\nwith ranked as (\n  select id, row_number() over (partition by site order by bid_cents desc, last_bid_at asc, id asc) as r\n  from listings\n  where bid_cents > 0\n)\nupdate listings l set rank = ranked.r from ranked where l.id = ranked.id;\n\ninsert into activity (id, site, listing_id, kind, amount_cents, rank_to, title, created_at) values\n('act_fb_01', 'founders', 'lst_fb_01', 'rebid', 40000, 1, 'Northstar Labs', now() - interval '11 minutes'),\n('act_fb_02', 'founders', 'lst_fb_02', 'rebid', 20000, 2, 'Aperture Studio', now() - interval '38 minutes'),\n('act_fb_03', 'founders', 'lst_fb_03', 'bid', 555000, 3, 'Kite & Co', now() - interval '2 hours'),\n('act_fb_04', 'founders', 'lst_fb_07', 'swap', 36000, 7, 'Foldline', now() - interval '9 hours'),\n('act_fb_05', 'founders', 'lst_fb_04', 'rebid', 10000, 4, 'Lumen', now() - interval '3 hours'),\n('act_fb_06', 'founders', 'lst_fb_15', 'bid', 9500, 15, 'Small Hours', now() - interval '3 days'),\n('act_fb_07', 'founders', 'lst_fb_01', 'bid', 1200000, 1, 'Northstar Labs', now() - interval '2 days'),\n('act_fb_08', 'founders', 'lst_fb_20', 'bid', 500, 20, 'Seed & Signal', now() - interval '6 days 12 hours'),\n('act_bc_01', 'bidception', 'lst_bc_01', 'rebid', 60000, 1, 'Outbid.lol', now() - interval '6 minutes'),\n('act_bc_02', 'bidception', 'lst_bc_02', 'rebid', 15000, 2, 'Bidwar.lol', now() - interval '22 minutes'),\n('act_bc_03', 'bidception', 'lst_bc_03', 'bid', 710000, 3, 'Rankstack.lol', now() - interval '41 minutes'),\n('act_bc_04', 'bidception', 'lst_bc_04', 'swap', 108000, 4, 'Paytorank.lol', now() - interval '1 hour'),\n('act_bc_05', 'bidception', 'lst_bc_05', 'rebid', 20000, 5, 'Leaderbid.lol', now() - interval '2 hours'),\n('act_bc_06', 'bidception', 'lst_bc_20', 'bid', 500, 20, 'Underdog.lol', now() - interval '6 days'),\n('act_bc_07', 'bidception', 'lst_bc_01', 'bid', 1800000, 1, 'Outbid.lol', now() - interval '4 days'),\n('act_bc_08', 'bidception', 'lst_bc_12', 'swap', 4800, 12, 'Overbid.lol', now() - interval '1 day')\non conflict do nothing;\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_boards.sql": _0002_boards_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
function makeId(prefix) {
	const bytes = /* @__PURE__ */ new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
function makeToken() {
	const bytes = /* @__PURE__ */ new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function normalizeUrl(raw) {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error("Enter a URL.");
	const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	let parsed;
	try {
		parsed = new URL(withProto);
	} catch {
		throw new Error("That URL is not valid.");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Only http and https URLs can be listed.");
	parsed.hash = "";
	if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) parsed.pathname = parsed.pathname.slice(0, -1);
	parsed.hostname = parsed.hostname.toLowerCase();
	return parsed.toString();
}
function urlKey(url) {
	const u = new URL(normalizeUrl(url));
	return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}${u.search}`.toLowerCase();
}
var siteSchema = object({ site: _enum(["founders", "bidception"]) });
function asIso(value) {
	if (value instanceof Date) return value.toISOString();
	return String(value);
}
function mapListing(row) {
	return {
		id: row.id,
		site: row.site,
		url: row.url,
		title: row.title,
		tagline: row.tagline,
		team: row.team,
		bidCents: Number(row.bid_cents),
		rank: row.rank == null ? null : Number(row.rank),
		clicks: Number(row.clicks),
		swapCount: Number(row.swap_count),
		lastBidAt: asIso(row.last_bid_at),
		createdAt: asIso(row.created_at)
	};
}
function mapActivity(row) {
	return {
		id: row.id,
		site: row.site,
		listingId: row.listing_id,
		kind: row.kind,
		amountCents: row.amount_cents == null ? null : Number(row.amount_cents),
		rankTo: row.rank_to == null ? null : Number(row.rank_to),
		title: row.title,
		createdAt: asIso(row.created_at)
	};
}
async function recastRanks(site) {
	await (await getSql()).query(`with ranked as (
       select id,
         row_number() over (order by bid_cents desc, last_bid_at asc, id asc) as r
       from listings
       where site = $1 and bid_cents > 0
     )
     update listings l set rank = ranked.r from ranked where l.id = ranked.id`, [site]);
}
async function fetchListing(id) {
	const rows = await (await getSql()).query(`select id, site, url, title, tagline, team, bid_cents, rank, clicks, swap_count,
            last_bid_at::text as last_bid_at, created_at::text as created_at
     from listings where id = $1`, [id]);
	return rows[0] ? mapListing(rows[0]) : null;
}
function parsePayload(raw) {
	if (!raw) return {};
	if (typeof raw === "string") try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
	if (typeof raw === "object") return raw;
	return {};
}
function assertWholeDollars(amount) {
	if (!Number.isInteger(amount) || amount < 5) throw new Error("Bids are whole dollars only, minimum $5.");
}
var listingSelect = `id, site, url, title, tagline, team, bid_cents, rank, clicks, swap_count,
  last_bid_at::text as last_bid_at, created_at::text as created_at`;
async function loadBoard(site) {
	const sql = await getSql();
	const listings = await sql.query(`select ${listingSelect}
     from listings
     where site = $1 and bid_cents > 0
     order by bid_cents desc, last_bid_at asc, id asc
     limit 100`, [site]);
	const statsRows = await sql.query(`select count(*)::int as count,
            coalesce(sum(bid_cents), 0)::bigint as pool,
            coalesce(sum(clicks), 0)::bigint as clicks
     from listings where site = $1 and bid_cents > 0`, [site]);
	const activity = await sql.query(`select id, site, listing_id, kind, amount_cents, rank_to, title, created_at::text as created_at
     from activity
     where site = $1
     order by created_at desc
     limit 24`, [site]);
	const stats = statsRows[0];
	return {
		listings: listings.map(mapListing),
		stats: {
			count: Number(stats?.count ?? 0),
			poolCents: Number(stats?.pool ?? 0),
			clicks: Number(stats?.clicks ?? 0)
		},
		activity: activity.map(mapActivity)
	};
}
var getBoard_createServerFn_handler = createServerRpc({
	id: "84518a2bc72d0e2a7fb249b94ca8fb8bf4d934d2b8c284841c592b4346689f0f",
	name: "getBoard",
	filename: "src/lib/board-fns.ts"
}, (opts) => getBoard.__executeServer(opts));
var getBoard = createServerFn({ method: "GET" }).validator(siteSchema.parse).handler(getBoard_createServerFn_handler, async ({ data }) => loadBoard(data.site));
var getPortal_createServerFn_handler = createServerRpc({
	id: "cd84e7f71e960890cbda70e6a2d7be7585cec800f415e0220056268fd8d47a6e",
	name: "getPortal",
	filename: "src/lib/board-fns.ts"
}, (opts) => getPortal.__executeServer(opts));
var getPortal = createServerFn({ method: "GET" }).handler(getPortal_createServerFn_handler, async () => {
	const [founders, bidception] = await Promise.all([loadBoard("founders"), loadBoard("bidception")]);
	return {
		founders,
		bidception
	};
});
var getListing_createServerFn_handler = createServerRpc({
	id: "05da579c6e516855476589258619df623ee7e496651ed18189b61aec62d8f377",
	name: "getListing",
	filename: "src/lib/board-fns.ts"
}, (opts) => getListing.__executeServer(opts));
var getListing = createServerFn({ method: "GET" }).validator(object({ id: string().min(1) }).parse).handler(getListing_createServerFn_handler, async ({ data }) => {
	const listing = await fetchListing(data.id);
	if (!listing) throw new Error("Listing not found.");
	return {
		listing,
		activity: (await (await getSql()).query(`select id, site, listing_id, kind, amount_cents, rank_to, title, created_at::text as created_at
       from activity where listing_id = $1 order by created_at desc limit 12`, [data.id])).map(mapActivity)
	};
});
var quoteBid_createServerFn_handler = createServerRpc({
	id: "51d37da3a6a2e78172cb3001e7058285bd097df76f95d491549e0a60dd724ab0",
	name: "quoteBid",
	filename: "src/lib/board-fns.ts"
}, (opts) => quoteBid.__executeServer(opts));
var quoteBid = createServerFn({ method: "GET" }).validator(object({
	site: _enum(["founders", "bidception"]),
	url: string().min(1),
	amountDollars: number().optional()
}).parse).handler(quoteBid_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const key = urlKey(data.url);
	const existing = await sql.query(`select ${listingSelect} from listings where site = $1 and url_key = $2`, [data.site, key]);
	const current = existing[0] ? mapListing(existing[0]) : null;
	const amount = data.amountDollars;
	if (amount == null) return {
		exists: Boolean(current),
		current,
		chargeCents: null,
		targetBidCents: null,
		message: current ? `Already listed at $${(current.bidCents / 100).toFixed(0)}. Re-bid only pays the difference.` : "New listing. Minimum $5."
	};
	assertWholeDollars(amount);
	const target = amount * 100;
	if (current) {
		if (target <= current.bidCents) throw new Error(`Need more than $${(current.bidCents / 100).toFixed(0)} to outbid this URL.`);
		return {
			exists: true,
			current,
			chargeCents: target - current.bidCents,
			targetBidCents: target,
			message: `Pay $${((target - current.bidCents) / 100).toFixed(0)} more to move this listing to $${amount}.`
		};
	}
	return {
		exists: false,
		current: null,
		chargeCents: target,
		targetBidCents: target,
		message: `New listing. Charge $${amount}.`
	};
});
var createBidOrder_createServerFn_handler = createServerRpc({
	id: "a0a5a5e21f8c3bd454681d3ff96d69abe659cd6378bc36c6e0023acffe53de5c",
	name: "createBidOrder",
	filename: "src/lib/board-fns.ts"
}, (opts) => createBidOrder.__executeServer(opts));
var createBidOrder = createServerFn({ method: "POST" }).validator(object({
	site: _enum(["founders", "bidception"]),
	url: string().min(3),
	title: string().min(2).max(80),
	tagline: string().max(140),
	team: string().max(140),
	amountDollars: number()
}).parse).handler(createBidOrder_createServerFn_handler, async ({ data }) => {
	assertWholeDollars(data.amountDollars);
	const url = normalizeUrl(data.url);
	const key = urlKey(url);
	const sql = await getSql();
	const existing = await sql.query(`select ${listingSelect} from listings where site = $1 and url_key = $2`, [data.site, key]);
	const current = existing[0] ? mapListing(existing[0]) : null;
	const target = data.amountDollars * 100;
	if (current && target <= current.bidCents) throw new Error(`Need more than $${(current.bidCents / 100).toFixed(0)} to re-bid this URL.`);
	const charge = current ? target - current.bidCents : target;
	const orderId = makeId("ord");
	const manageToken = current ? null : makeToken();
	const payload = {
		url,
		urlKey: key,
		title: data.title.trim(),
		tagline: data.tagline.trim(),
		team: data.team.trim(),
		targetBidCents: target,
		listingId: current?.id ?? null
	};
	await sql.query(`insert into orders (id, site, kind, amount_cents, status, listing_id, manage_token, payload)
       values ($1, $2, 'bid', $3, 'pending', $4, $5, $6::jsonb)`, [
		orderId,
		data.site,
		charge,
		current?.id ?? null,
		manageToken,
		JSON.stringify(payload)
	]);
	return { orderId };
});
var createSwapOrder_createServerFn_handler = createServerRpc({
	id: "c684eae2b96453e54df19cdd67254722ceb4de2211854072e82574ce27b081af",
	name: "createSwapOrder",
	filename: "src/lib/board-fns.ts"
}, (opts) => createSwapOrder.__executeServer(opts));
var createSwapOrder = createServerFn({ method: "POST" }).validator(object({
	token: string().min(8),
	newUrl: string().min(3)
}).parse).handler(createSwapOrder_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const rows = await sql.query(`select ${listingSelect} from listings where manage_token = $1`, [data.token]);
	const listing = rows[0] ? mapListing(rows[0]) : null;
	if (!listing) throw new Error("Manage link is not valid.");
	const quote = quoteSwapFee({
		bidCents: listing.bidCents,
		rank: listing.rank,
		swapCount: listing.swapCount
	});
	if (!quote.allowed) throw new Error(quote.reason);
	const url = normalizeUrl(data.newUrl);
	const key = urlKey(url);
	if (key === urlKey(listing.url)) throw new Error("That is already the listed URL.");
	if ((await sql.query(`select id from listings where site = $1 and url_key = $2 and id <> $3`, [
		listing.site,
		key,
		listing.id
	]))[0]) throw new Error("Another listing already holds that URL.");
	const orderId = makeId("ord");
	const payload = {
		listingId: listing.id,
		newUrl: url,
		urlKey: key,
		title: listing.title,
		nextSwapNumber: quote.nextSwapNumber
	};
	await sql.query(`insert into orders (id, site, kind, amount_cents, status, listing_id, manage_token, payload)
       values ($1, $2, 'swap', $3, 'pending', $4, $5, $6::jsonb)`, [
		orderId,
		listing.site,
		quote.feeCents,
		listing.id,
		data.token,
		JSON.stringify(payload)
	]);
	return { orderId };
});
var getOrder_createServerFn_handler = createServerRpc({
	id: "db5ad1d49b89b6b6279ee9211d68cc12f07b60afc370b24cd18f74573d5f226a",
	name: "getOrder",
	filename: "src/lib/board-fns.ts"
}, (opts) => getOrder.__executeServer(opts));
var getOrder = createServerFn({ method: "GET" }).validator(object({ orderId: string().min(1) }).parse).handler(getOrder_createServerFn_handler, async ({ data }) => {
	const row = (await (await getSql()).query(`select id, site, kind, amount_cents, status, listing_id, payload
       from orders where id = $1`, [data.orderId]))[0];
	if (!row || !isSiteId(row.site)) throw new Error("Order not found.");
	const payload = parsePayload(row.payload);
	const title = String(payload.title ?? "Listing");
	const url = String(payload.url ?? payload.newUrl ?? "");
	const chargeLabel = row.kind === "swap" ? "URL swap fee" : payload.listingId ? "Re-bid difference" : "New listing bid";
	return {
		id: row.id,
		site: row.site,
		kind: row.kind,
		amountCents: Number(row.amount_cents),
		status: row.status,
		title,
		url,
		chargeLabel,
		listingId: row.listing_id
	};
});
var confirmPayment_createServerFn_handler = createServerRpc({
	id: "75257d72de85c38c000aa3cf197609266057a6483d5408a520738f52425a5a4f",
	name: "confirmPayment",
	filename: "src/lib/board-fns.ts"
}, (opts) => confirmPayment.__executeServer(opts));
var confirmPayment = createServerFn({ method: "POST" }).validator(object({ orderId: string().min(1) }).parse).handler(confirmPayment_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const order = (await sql.query(`select id, site, kind, amount_cents, status, listing_id, manage_token, payload
       from orders where id = $1`, [data.orderId]))[0];
	if (!order || !isSiteId(order.site)) throw new Error("Order not found.");
	if (order.status === "paid") {
		const listingId = order.listing_id;
		if (!listingId) throw new Error("Paid order is missing a listing.");
		const listing = await fetchListing(listingId);
		if (!listing) throw new Error("Listing missing.");
		return {
			alreadyPaid: true,
			listing,
			token: order.manage_token,
			site: order.site
		};
	}
	if (order.status !== "pending") throw new Error("This order can no longer be paid.");
	const payload = parsePayload(order.payload);
	let listingId = order.listing_id;
	let token = order.manage_token;
	let kind = "bid";
	if (order.kind === "bid") {
		const targetBidCents = Number(payload.targetBidCents);
		const title = String(payload.title ?? "Listing");
		const tagline = String(payload.tagline ?? "");
		const team = String(payload.team ?? "");
		const url = String(payload.url);
		const key = String(payload.urlKey);
		if (listingId) {
			const current = await fetchListing(listingId);
			if (!current) throw new Error("Listing missing.");
			if (targetBidCents <= current.bidCents) throw new Error("This bid is no longer high enough.");
			await sql.query(`update listings
           set bid_cents = $1, title = $2, tagline = $3, team = $4, url = $5, url_key = $6, last_bid_at = now()
           where id = $7`, [
				targetBidCents,
				title,
				tagline,
				team,
				url,
				key,
				listingId
			]);
			kind = "rebid";
			token = (await sql.query(`select manage_token from listings where id = $1`, [listingId]))[0]?.manage_token ?? token;
		} else {
			listingId = makeId("lst");
			token = token ?? makeToken();
			await sql.query(`insert into listings
            (id, site, url, url_key, title, tagline, team, bid_cents, clicks, swap_count, manage_token, last_bid_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,0,0,$9, now())`, [
				listingId,
				order.site,
				url,
				key,
				title,
				tagline,
				team,
				targetBidCents,
				token
			]);
			kind = "bid";
		}
		await recastRanks(order.site);
		const listing = await fetchListing(listingId);
		await sql.query(`insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title)
         values ($1,$2,$3,$4,$5,$6,$7)`, [
			makeId("act"),
			order.site,
			listingId,
			kind,
			Number(order.amount_cents),
			listing?.rank ?? null,
			title
		]);
	} else {
		if (!listingId) throw new Error("Swap is missing a listing.");
		const listing = await fetchListing(listingId);
		if (!listing) throw new Error("Listing missing.");
		const quote = quoteSwapFee({
			bidCents: listing.bidCents,
			rank: listing.rank,
			swapCount: listing.swapCount
		});
		if (!quote.allowed) throw new Error(quote.reason);
		const newUrl = String(payload.newUrl);
		const key = String(payload.urlKey);
		await sql.query(`update listings set url = $1, url_key = $2, swap_count = swap_count + 1 where id = $3`, [
			newUrl,
			key,
			listingId
		]);
		await recastRanks(order.site);
		const updated = await fetchListing(listingId);
		await sql.query(`insert into activity (id, site, listing_id, kind, amount_cents, rank_to, title)
         values ($1,$2,$3,'swap',$4,$5,$6)`, [
			makeId("act"),
			order.site,
			listingId,
			Number(order.amount_cents),
			updated?.rank ?? null,
			listing.title
		]);
		token = (await sql.query(`select manage_token from listings where id = $1`, [listingId]))[0]?.manage_token ?? token;
		kind = "swap";
	}
	await sql.query(`update orders set status = 'paid', paid_at = now(), listing_id = $1, manage_token = $2 where id = $3`, [
		listingId,
		token,
		order.id
	]);
	const listing = listingId ? await fetchListing(listingId) : null;
	if (!listing || !token) throw new Error("Payment recorded, listing missing.");
	return {
		alreadyPaid: false,
		listing,
		token,
		site: order.site,
		kind
	};
});
var getManaged_createServerFn_handler = createServerRpc({
	id: "02ce8b4f5428c757d1b2cc3d317cec158d6fe5fc562ae4ba365a5ce828860e9b",
	name: "getManaged",
	filename: "src/lib/board-fns.ts"
}, (opts) => getManaged.__executeServer(opts));
var getManaged = createServerFn({ method: "GET" }).validator(object({ token: string().min(8) }).parse).handler(getManaged_createServerFn_handler, async ({ data }) => {
	const rows = await (await getSql()).query(`select ${listingSelect} from listings where manage_token = $1`, [data.token]);
	const listing = rows[0] ? mapListing(rows[0]) : null;
	if (!listing) throw new Error("Manage link is not valid.");
	return {
		listing,
		quote: quoteSwapFee({
			bidCents: listing.bidCents,
			rank: listing.rank,
			swapCount: listing.swapCount
		}),
		token: data.token
	};
});
var trackClick_createServerFn_handler = createServerRpc({
	id: "900f1ccade2f1f50c07d87c4cebdc51cec854abf9e3d4a6cc2753caf43bdfcd6",
	name: "trackClick",
	filename: "src/lib/board-fns.ts"
}, (opts) => trackClick.__executeServer(opts));
var trackClick = createServerFn({ method: "POST" }).validator(object({ id: string().min(1) }).parse).handler(trackClick_createServerFn_handler, async ({ data }) => {
	const row = (await (await getSql()).query(`update listings set clicks = clicks + 1 where id = $1 returning url, clicks`, [data.id]))[0];
	if (!row) throw new Error("Listing not found.");
	return {
		url: row.url,
		clicks: Number(row.clicks)
	};
});
//#endregion
export { confirmPayment_createServerFn_handler, createBidOrder_createServerFn_handler, createSwapOrder_createServerFn_handler, getBoard_createServerFn_handler, getListing_createServerFn_handler, getManaged_createServerFn_handler, getOrder_createServerFn_handler, getPortal_createServerFn_handler, quoteBid_createServerFn_handler, trackClick_createServerFn_handler };
