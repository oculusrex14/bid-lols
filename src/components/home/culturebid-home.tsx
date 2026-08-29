import { product } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { Kicker } from "@/components/home/shared";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { SectionHeader } from "@/components/ui/layout";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import { Camera, Clapperboard, Mic, PenTool, Tag, Type, Users, Video, Wrench } from "lucide-react";

const FORMAT_ICONS: Record<string, typeof Camera> = {
  ugc: Users,
  "social content": Users,
  video: Video,
  "short video": Clapperboard,
  photography: Camera,
  illustration: PenTool,
  design: PenTool,
  naming: Tag,
  writing: Type,
  memes: Type,
  music: Mic,
  "brand challenge": Wrench,
};

/** Display label + icon -> the REAL browse filter value (no dead links). */
const FORMAT_LINKS: Array<{ label: string; icon: typeof Camera; href: string }> = [
  { label: "UGC", icon: Users, href: "/bounties?category=ugc" },
  { label: "Short video", icon: Clapperboard, href: "/bounties?category=video" },
  { label: "Photography", icon: Camera, href: "/bounties?category=photography" },
  { label: "Design", icon: PenTool, href: "/bounties?category=design" },
  { label: "Writing", icon: Type, href: "/bounties?category=writing" },
  { label: "Naming", icon: Tag, href: "/bounties?category=naming" },
  { label: "Social content", icon: Users, href: "/bounties?category=social%20content" },
  { label: "Music", icon: Mic, href: "/bounties?category=music" },
  { label: "Memes", icon: Type, href: "/bounties?category=memes" },
  { label: "Brand challenge", icon: Wrench, href: "/bounties?category=brand%20challenge" },
];

/**
 * CultureBid home (RC3, S-26): creative-format-first, visual composition
 * from real data only. No stock imagery, no fake thumbnails: the visual
 * language is the format icon system + live brief previews + typography.
 */
type HomeOpenItem = Extract<HomePreview, { kind: "bounties" }>["items"];

export function CulturebidHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const cfg = product("culturebid");
  const openItems = preview.kind === "bounties" ? preview.items : [];

  return (
    <>
      <CultureHero me={me} openItems={openItems} />
      {/* 2 — Formats you can commission (each links into a REAL filter). */}
      <section className="canvas-wide mt-14 sm:mt-16">
        <SectionHeader title="What you can commission" />
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FORMAT_LINKS.map((f) => (
            <li key={f.label}>
              <a
                href={f.href}
                className="flex items-center gap-2.5 rounded-sm border border-fg/10 bg-surface/50 px-3 py-2.5 transition-colors duration-150 hover:border-fg/35"
              >
                <f.icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-sm font-medium">{f.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <CultureOpenBriefs openItems={openItems} />
      <CultureRules />
      {/* 5 — Funding state + write up, secondary. */}
      <section className="canvas-wide py-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted" data-testid="funding-note">
          Accounts, profiles, and drafts work today. Funding is not enabled
          yet, so nothing on this site takes payment now.
        </p>
        <a
          href="/blog/fair-creative-bounty"
          className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-4"
        >
          What a fair creative bounty looks like
        </a>
      </section>

      <JsonLd data={[websiteSchema("culturebid")]} />

      <section className="canvas-wide pb-16">
        <FoundingAccess
          site="culturebid"
          heading="Want to know when funding opens?"
          intro="Leave your email and we will write once payments go live on CultureBid. No other updates, no marketing list."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}
/** 1 — Hero, 7/5: statement left, live briefs (or labelled example) right. */
function CultureHero({ me, openItems }: { me: ShellMe | null | undefined; openItems: HomeOpenItem }) {
  return (
        <section className="canvas-wide grid grid-cols-1 gap-8 pt-14 sm:pt-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Kicker>CultureBid</Kicker>
            <h1 className="mt-4 font-display-site text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
              A better way to{" "}
              <span className="block text-accent">commission creative work.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Brands post a brief with a published reward, a deadline, and a
              capped number of creator slots. Creators read the full rules,
              including how the winning work is licensed, before they start.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/bounties/new"
                className="inline-flex h-12 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent/90"
              >
                Post a brief
              </a>
              <a
                href="/bounties"
                className="inline-flex h-12 items-center rounded-sm border border-fg/25 px-5 text-sm font-semibold transition-colors duration-150 hover:border-fg/50"
              >
                Browse briefs
              </a>
              {me ? (
                <a href="/dashboard" className="text-sm font-medium text-accent underline underline-offset-4">
                  Your dashboard
                </a>
              ) : (
                <a href="/signup" className="text-sm font-medium text-accent underline underline-offset-4">
                  Create an account
                </a>
              )}
            </div>
          </div>
  
          <div className="lg:col-span-5">
            {openItems.length > 0 ? (
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4" aria-label="Live creative briefs">
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Live briefs</p>
                <ul className="mt-3 space-y-3">
                  {openItems.slice(0, 3).map((b) => {
                    const Icon = b.creative?.formats?.length ? (FORMAT_ICONS[b.creative.formats[0]] ?? Camera) : Camera;
                    return (
                      <li key={b.id}>
                        <a href={`/bounties/${b.id}`} className="-m-2 block rounded-sm p-2 transition-colors duration-150 hover:bg-raised/60">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold hover:underline hover:underline-offset-4">{b.title}</span>
                              <span className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-subtle">
                                <span>{b.category}</span>
                                <MoneyValue minor={b.reward_total_minor} currency={b.currency} size="sm" className="text-accent" />
                              </span>
                            </span>
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <a href="/bounties" className="mt-3 inline-block text-xs font-medium text-accent underline underline-offset-4">
                  See all briefs
                </a>
              </div>
            ) : (
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4" aria-label="Example brief (not live)">
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Example, not a live brief</p>
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent">
                    <Clapperboard className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Three 15-second Reels for a skincare launch</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Short video · posted on Instagram · reward ₹50,000 · two
                      creator slots · winner is licensed for paid amplification
                      for 90 days.
                    </p>
                    <p className="mt-2 text-xs text-subtle">This is an example. It is not a live brief.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
  
  );
}
/** 3 — Open briefs (real inventory, or the honest empty state). */
function CultureOpenBriefs({ openItems }: { openItems: HomeOpenItem }) {
  return (
        <section className="canvas-wide py-10 sm:py-12">
          <SectionHeader
            title="Open now"
            aside={
              <a href="/bounties" className="text-xs font-medium text-accent underline underline-offset-4">
                Browse all
              </a>
            }
          />
          {openItems.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openItems.map((b) => {
                const Icon = b.creative?.formats?.length ? (FORMAT_ICONS[b.creative.formats[0]] ?? Camera) : Camera;
                return (
                  <a
                    key={b.id}
                    href={`/bounties/${b.id}`}
                    className="group rounded-md border border-fg/15 bg-surface p-4 transition-colors duration-150 hover:border-fg/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-sm bg-accent-soft text-accent">
                        <Icon className="size-4.5" aria-hidden="true" />
                      </span>
                      <MoneyValue minor={b.reward_total_minor} currency={b.currency} size="lg" className="text-accent" />
                    </div>
                    <h2 className="mt-3 text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">{b.title}</h2>
                    <div className="mt-2 flex items-center justify-between border-t border-fg/10 pt-3">
                      <StatusBadge status={b.status} />
                      <span className="text-xs text-subtle" title={absoluteDate(b.submission_deadline)}>
                        {b.participants}/{b.participant_cap} slots · {deadlinePhrase(b.submission_deadline)}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-fg/15 bg-surface/40 p-6 text-sm leading-relaxed text-muted">
              No open briefs yet. Brands post creative briefs with a reward, a
              deadline, and a capped field of creators; creators know the full
              rules, including licensing, before they start. The first live
              briefs will appear here.
            </div>
          )}
        </section>
  
  );
}
/** 4 — The rules, short: what makes a brief fair. */
function CultureRules() {
  return (
        <section className="canvas-wide py-8">
          <SectionHeader title="The rules, before anyone starts" />
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div>
              <h2 className="text-sm font-semibold">Capped entries</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Every brief states exactly how many creators take part. No
                unlimited field, no "top of the feed wins."
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold">Published reward structure</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Winner takes all, a podium, or a finalist pool: the split is
                shown on the brief before the work begins, and the advertised
                amount is exactly what is paid.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold">Clear licensing</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Where the winning work will run, for how long, and whether it
                is used commercially: stated in the brief, not negotiated
                after the fact.
              </p>
            </div>
          </div>
        </section>
  
  );
}
