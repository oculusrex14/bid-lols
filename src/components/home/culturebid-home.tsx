import { Kicker } from "@/components/home/shared";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status";
import { SectionHeader } from "@/components/ui/layout";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import {
  CultureBriefCard,
  CultureBriefTile,
} from "@/components/product-objects/culture-brief-card";
import {
  CULTURE_BRIEF_EXAMPLE,
  CULTURE_SAMPLE_WALL,
} from "@/lib/sample-content";
import { artForCategory } from "@/components/product-objects/category-art";
import { Camera, Clapperboard, Mic, PenTool, Tag, Type, Users, Video, Wrench } from "lucide-react";

/**
 * CultureBid home (RC5 §21): the editorial creative studio. Poster hero
 * (16:9 local art, framed, EXAMPLE-labelled when it is a sample), a
 * sample brief wall that is clearly labelled sample, and real brief cards
 * that render ONLY stored fields (usageNotes when present, never
 * inferred rights). No remote stock media, ever.
 */

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
 * Deterministic LOCAL art per category (public/sample-media/culture;
 * RC5 §21.3): content artwork for the object morphology. Never labelled
 * sample when it frames a REAL brief: the text on the card is what the
 * data says.
 */

type HomeOpenItem = Extract<HomePreview, { kind: "bounties" }>["items"];

export function CulturebidHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const openItems = preview.kind === "bounties" ? preview.items : [];
  void me;
  return (
    <>
      <CultureHero openItems={openItems} />
      <FormatsSection />
      {openItems.length > 0 ? (
        <OpenBriefsSection openItems={openItems} />
      ) : (
        <>
          <EmptyBriefsStage />
          <SampleBriefWall />
        </>
      )}
      <CultureRules />
      <section className="canvas-brand mt-6 py-6">
        <SectionHeader title="The write up" />
        <a
          href="/blog/fair-creative-bounty"
          className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
        >
          What a fair creative bounty looks like
        </a>
      </section>
      <JsonLd data={[websiteSchema("culturebid")]} />
      <section className="canvas-brand pb-16">
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

/** 1 — Hero: editorial statement left, brief poster right. */
function CultureHero({ openItems }: { openItems: HomeOpenItem }) {
  const first = openItems[0];
  return (
    <section className="canvas-brand grid grid-cols-1 gap-10 pt-14 sm:pt-20 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Kicker>CultureBid</Kicker>
        <h1 className="obj-hero-type mt-5">
          A better way to{" "}
          <span className="block">commission</span>{" "}
          <span className="block font-display italic text-accent">creative work.</span>
        </h1>
        <p className="obj-hero-lead mt-5 text-muted">
          Brands post a brief with a published reward, a deadline, and a
          capped field of creators. Creators read the full rules, including
          how the winning work is licensed, before they start.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/bounties/new" size="lg">
            Post a brief
          </ButtonLink>
          <ButtonLink href="/bounties" variant="secondary" size="lg">
            Browse briefs
          </ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        {first ? (
          <CultureBriefCard
            sample={false}
            title={first.title}
            rewardMinor={first.reward_total_minor}
            currency={first.currency}
            slotsTaken={first.participants}
            slotsCap={first.participant_cap}
            licenseLine={first.creative?.usageNotes ?? "See brief for usage terms"}
            media={artForCategory(first.category)}
          />
        ) : (
          <CultureBriefCard
            sample
            title={CULTURE_BRIEF_EXAMPLE.title}
            support={CULTURE_BRIEF_EXAMPLE.support}
            rewardMinor={CULTURE_BRIEF_EXAMPLE.rewardMinor}
            currency={CULTURE_BRIEF_EXAMPLE.currency}
            slotsTaken={CULTURE_BRIEF_EXAMPLE.slotsTaken}
            slotsCap={CULTURE_BRIEF_EXAMPLE.slotsCap}
            licenseLine={CULTURE_BRIEF_EXAMPLE.licenseLine}
            media={CULTURE_BRIEF_EXAMPLE.media}
            note={CULTURE_BRIEF_EXAMPLE.note}
          />
        )}
        <p className="mt-3 text-xs text-subtle">
          {first ? (
            <>
              Live brief. Closes {deadlinePhrase(first.submission_deadline)}{" "}
              (<span title={absoluteDate(first.submission_deadline)}>{first.category}</span>).
            </>
          ) : (
            "The first live briefs will open in this shape."
          )}
        </p>
      </div>
    </section>
  );
}

/** 2 — Formats you can commission (real filter targets, gallery look). */
function FormatsSection() {
  return (
    <section className="canvas-brand mt-14 sm:mt-16">
      <SectionHeader title="What you can commission" />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FORMAT_LINKS.map((f) => (
          <li key={f.label}>
            <a
              href={f.href}
              className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 transition-colors duration-150 hover:border-line-strong"
            >
              <f.icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-sm font-medium">{f.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 3 — Open briefs: real inventory only, poster-tile cards. */
function OpenBriefsSection({ openItems }: { openItems: HomeOpenItem }) {
  return (
    <section className="canvas-brand py-10 sm:py-12">
      <SectionHeader
        title="Open now"
        aside={
          <a href="/bounties" className="text-xs font-medium text-accent underline underline-offset-4">
            Browse all
          </a>
        }
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {openItems.map((b) => (
          <a key={b.id} href={`/bounties/${b.id}`} className="group block">
            <CultureBriefCard
              sample={false}
              title={b.title}
              rewardMinor={b.reward_total_minor}
              currency={b.currency}
              slotsTaken={b.participants}
              slotsCap={b.participant_cap}
              licenseLine={b.creative?.usageNotes ?? "See brief for usage terms"}
              media={artForCategory(b.category)}
              className="transition-shadow duration-150 group-hover:brightness-[0.98]"
            />
            <div className="mt-2 flex items-center justify-between px-1 text-xs text-subtle">
              <StatusBadge status={b.status} />
              <span title={absoluteDate(b.submission_deadline)}>
                {deadlinePhrase(b.submission_deadline)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/** The honest empty stage (real inventory = zero). */
function EmptyBriefsStage() {
  return (
    <section className="canvas-brand py-10 sm:py-12">
      <SectionHeader title="Open now" />
      <div
        className="mt-5 rounded-md border border-dashed border-line-strong bg-surface/40 p-6 sm:p-8"
        data-testid="open-now-empty"
      >
        <p className="font-display-site text-lg tracking-tight">No open briefs yet.</p>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          Brands post creative briefs with a reward, a deadline, and a capped
          field of creators; creators know the full rules, including
          licensing, before they start.
        </p>
        <div className="mt-4">
          <ButtonLink href="/bounties/new" variant="secondary">
            Post the first brief
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** 4 — The labelled sample wall (only when live inventory is empty). */
function SampleBriefWall() {
  return (
    <section className="canvas-brand py-10 sm:py-12" data-sample-wall="true">
      <SectionHeader
        title="Sample briefs"
        aside={<span className="obj-microlabel text-subtle">SAMPLE, NOT LIVE</span>}
      />
      {/* RC5 §21.7: wide 4-up, <=900px 2-up, mobile 1-up. */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CULTURE_SAMPLE_WALL.map((s) => (
          <CultureBriefTile
            key={s.category}
            sample
            category={s.category}
            title={s.title}
            rewardMinor={s.rewardMinor}
            currency={s.currency}
            slotsTaken={s.slotsTaken}
            slotsCap={s.slotsCap}
            licenseLine={s.licenseLine}
            media={s.media}
          />
        ))}
      </div>
    </section>
  );
}

/** 5 — The rules, short: what makes a brief fair. */
function CultureRules() {
  return (
    <section className="canvas-brand py-8">
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
            Where the winning work will run, for how long, and whether it is
            used commercially: stated in the brief, not negotiated after the
            fact.
          </p>
        </div>
      </div>
    </section>
  );
}
