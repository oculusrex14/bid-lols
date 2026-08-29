/**
 * First-party blog content for the four Bid Network products (RC2, C5).
 *
 * Deliberately simple: typed block data, one module, no CMS, no MDX. Each
 * product domain gets its OWN article(s); a visitor to foundersbid.lol/blog
 * sees FoundersBid pieces, never another product's. Wrong-domain article
 * reads 301 to the article's product origin (route loader).
 *
 * The body renders to semantic HTML server-side (article-view.tsx): no
 * client JavaScript is required to read any word here.
 */
import type { ProductKey } from "@/lib/host";

export type BlogBlock =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "callout"; label: string; text: string }
  | {
      kind: "links";
      items: { label: string; to: string; external?: boolean }[];
    };

export type BlogArticle = {
  /** URL-safe slug, unique across the whole network. */
  slug: string;
  /** Which product domain hosts this article. */
  product: ProductKey;
  /** Visible H1 on the article page. */
  headline: string;
  /** Search title (used in <title> and BlogPosting.headline). */
  seoTitle: string;
  /** Meta description. */
  description: string;
  /** Real publication date (ISO). */
  publishedAt: string;
  /** Real last-modified date (ISO). Never generated from request time. */
  modifiedAt: string;
  blocks: BlogBlock[];
};

const DATE = "2026-08-28";

export const BLOG_ARTICLES: BlogArticle[] = [
  // ─────────────────────────────────────────────────────────────────────
  // FoundersBid
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "bounty-or-project",
    product: "foundersbid",
    headline:
      "Small startup jobs are too important for a backlog and too awkward for an agency",
    seoTitle: "A Better Way to Hire Freelancers for Startup Projects | FoundersBid",
    description:
      "Startup work often sits between a full-time hire and an agency. FoundersBid posts it two ways: a bounty for bounded competitive work, a project when you choose one provider before the work begins.",
    publishedAt: DATE,
    modifiedAt: DATE,
    blocks: [
      {
        kind: "p",
        text: "Every startup backlog has the same middle layer: work that matters, that is too small to justify a full-time hire, and too specific to hand to an agency. A landing page for a new market. A research pass before a pricing change. A script that automates a weekly report. A design for a flow you will demo next month.",
      },
      {
        kind: "p",
        text: "The usual options each fail in a different way. A general freelance marketplace buries you in proposals, many of them off the brief. An open competition asks more people to do unpaid work than you want. An agency adds overhead for a scope that was one afternoon of founder time. So the work gets done badly, done late, or not at all, and the person who knows the context best does it by hand.",
      },
      {
        kind: "h2",
        text: "Two ways to post the same kind of work",
      },
      {
        kind: "p",
        text: "FoundersBid is a marketplace for exactly that middle layer. You post a clearly scoped piece of work, set the budget and the deadline, and find people who want to do it. There are two ways to post it, and the difference is deliberate.",
      },
      {
        kind: "h3",
        text: "Bounty: when several people can try",
      },
      {
        kind: "p",
        text: "A bounty is a bounded, judgeable outcome. You write the brief so that someone can produce a submission you can compare: a landing page concept, a research write-up, a small development task, a design, an analysis. You set the reward, the deadline, and a cap on how many people take part. Each participant submits their best attempt. You review the submissions and pick the winner.",
      },
      {
        kind: "p",
        text: "A bounty suits work where competition improves the result. When several approaches are plausible, seeing them side by side is the point. A name for the product. A hook for a launch email. A first pass at a dashboard layout.",
      },
      {
        kind: "h3",
        text: "Project: when you choose the person first",
      },
      {
        kind: "p",
        text: "A project is for work where guessing is expensive. The provider writes a proposal before doing any deliverable work: their approach, evidence of relevant experience, a quote, a timeline, and a milestone plan. You review the proposals and pick one. The selected provider is funded before the work begins, and delivery runs through the published milestones, each paid when you approve it.",
      },
      {
        kind: "p",
        text: "Not every job should be a contest. A payment pipeline for your users is not a contest. One provider, one quote, one set of milestones.",
      },
      {
        kind: "p",
        text: "The one-line test: if three or more reasonable people could produce a result you can judge in an afternoon, post a bounty. If you need to trust one person for weeks, post a project.",
      },
      {
        kind: "h2",
        text: "The rules you see before the work starts",
      },
      {
        kind: "p",
        text: "The budget is fixed and public on the work page. The advertised reward is exactly what the winner receives; the platform fee is charged to you, the sponsor, on top of the reward. It is never deducted from the pool.",
      },
      {
        kind: "p",
        text: "You set the participant cap. Applications close on a date. Submissions close on a date. Selection is yours, against the brief you published. The IP terms are written on the work: the default is that the winning deliverable transfers to you once the reward is settled, and non-winning submissions stay with their authors unless the brief says otherwise.",
      },
      {
        kind: "table",
        headers: ["", "Bounty", "Project"],
        rows: [
          ["Who does the work", "Capped set of participants you approve", "One provider you select"],
          ["When work starts", "After applications close", "After you select the proposal"],
          ["How payment happens", "One funded reward, paid on winner selection", "Milestones, paid as you approve them"],
          ["Best for", "Bounded, judgeable outcomes", "Multi-week delivery where trust matters first"],
        ],
      },
      {
        kind: "h2",
        text: "What we are building, and what we are not",
      },
      {
        kind: "p",
        text: "FoundersBid is not a job board, not an employment platform, and not a design contest site. It is paid work with published rules, posted by people who will fund it. The graveyard side of the site exists for a different problem: abandoned projects that a founder would rather hand on than delete.",
      },
      {
        kind: "callout",
        label: "Current status",
        text: "Accounts, profiles, and drafts work today. Funding for work is not enabled yet, so no bounty or project on the site is payable at the moment. Every page says so plainly, and nothing on the site charges anyone.",
      },
      {
        kind: "links",
        items: [
          { label: "See open bounties", to: "/bounties" },
          { label: "See open projects", to: "/projects" },
          { label: "The Graveyard: assets worth continuing", to: "/graveyard" },
          { label: "Back to the FoundersBid home", to: "/" },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // CultureBid
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "fair-creative-bounty",
    product: "culturebid",
    headline: "A creative contest shouldn't mean 100 people working for free",
    seoTitle: "How to Run a Fair Creative Bounty for Brands and Creators | CultureBid",
    description:
      "Brands want several creative directions. Creators shouldn't do unlimited unpaid work. CultureBid caps entries, publishes the reward structure, and states the licensing rules before work starts.",
    publishedAt: DATE,
    modifiedAt: DATE,
    blocks: [
      {
        kind: "p",
        text: "Brands have a real reason to open creative work to several people. More directions means a better result. A naming brief benefits from ten approaches. A launch video benefits from two or three different cuts.",
      },
      {
        kind: "p",
        text: "Creators have a real reason to object to the usual format. An open contest asks everyone to produce the work first and ask questions later. Fifty people write copy. Five get shortlisted. One wins. Forty-nine did the work for free, and the brief said nothing about what happens to the runner-up material.",
      },
      {
        kind: "p",
        text: "Both sides are right, and the problem is the format, not the intent.",
      },
      {
        kind: "h2",
        text: "What changes when the rules are public",
      },
      {
        kind: "p",
        text: "CultureBid posts creative briefs with a reward, a deadline, and a cap on entries. The cap is the important part. The brand decides how many creators take part: ten slots for a naming brief, four for a video. The field is fixed before anyone submits.",
      },
      {
        kind: "p",
        text: "The reward structure is published with the brief. We support three shapes: winner takes all; a podium with three places; or a finalist pool with a winner premium. The exact split is written before entries open, so nobody works toward a vague promise.",
      },
      {
        kind: "p",
        text: "Licensing is part of the brief too. The brief states what happens to the winning work, and non-winning entries stay with their creators unless the brief says otherwise. That sentence is on the page before the creator applies.",
      },
      {
        kind: "h2",
        text: "What this is not",
      },
      {
        kind: "ul",
        items: [
          "Not an open submission portal. Entries are capped and the sponsor reviews applications against the brief.",
          "Not a content farm. Submissions are judged work, not volume.",
          "Not a guarantee of discovery. A brief reaches the creators who browse CultureBid. The network is new, so reach is small, and we would rather say that plainly than print a fake counter.",
        ],
      },
      {
        kind: "h2",
        text: "A concrete example",
      },
      {
        kind: "p",
        text: "A brand wants a 15-second launch video. The brief states the format, the channels it will run on, and the rights the brand keeps for the winning cut. It sets the reward: 50,000 rupees for the winner, two runner-up slots of 10,000 rupees each. It caps the field at four creators and sets a two-week deadline. Every number a creator needs to decide is in the brief. That is the product.",
      },
      {
        kind: "callout",
        label: "Current status",
        text: "Accounts, creative profiles, and draft briefs work today. Funding for briefs is not enabled yet, so no creative bounty on the site is payable at the moment. The page says so plainly.",
      },
      {
        kind: "links",
        items: [
          { label: "See open creative bounties", to: "/bounties" },
          { label: "Post a brief", to: "/bounties/new" },
          { label: "Back to the CultureBid home", to: "/" },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // Bidception
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "building-a-project-with-multiple-freelancers",
    product: "bidception",
    headline:
      "Big freelance projects break when one person is expected to do everything",
    seoTitle: "How to Build a Project With Multiple Freelancers | Bidception",
    description:
      "A product launch needs design, development, video, copy, and outreach. Bidception funds the whole project once, puts a paid captain in charge of the split, and reconciles every work package to the parent budget.",
    publishedAt: DATE,
    modifiedAt: DATE,
    blocks: [
      {
        kind: "p",
        text: "A launch needs more than one skill. A product launch wants a landing page, a demo video, launch copy, outreach, and analytics setup. No single freelancer does all five well. Hire five separate freelancers and you become the project manager: five briefs, five invoices, five calendars, and the integration of the results held together by hand.",
      },
      {
        kind: "p",
        text: "The usual workaround is to pick one strong generalist and hope. Hope is not a delivery plan.",
      },
      {
        kind: "h2",
        text: "The Bidception model",
      },
      {
        kind: "p",
        text: "Bidception funds the whole project in a single budget. The sponsor sets the total, and the total is public on the project page.",
      },
      {
        kind: "p",
        text: "The sponsor then picks a captain: a member with the track record for this kind of work. The captain is paid for coordination, because coordination is work.",
      },
      {
        kind: "p",
        text: "The captain splits the project into work packages: smaller bounded jobs with their own budgets, drawn from the parent pool. A landing page is one package. A demo video is another. Launch outreach is a third. Each package is either a competitive bounty or a proposal-first project, and specialists take the parts they are good at.",
      },
      {
        kind: "p",
        text: "The budget is a hard constraint. Allocated packages, the captain's fee, and any reserve add up to the funded total. The engine refuses to allocate more than exists, so a parent project cannot create money by nesting. When every package is done, the project settles: unused reserve goes back to the sponsor, and the settlement is recorded in the money ledger.",
      },
      {
        kind: "callout",
        label: "The technical term",
        text: "Internally we call this a nested bounty: a funded parent with funded children. The idea is simpler: one project, one budget, a funded split.",
      },
      {
        kind: "h2",
        text: "Why the captain gets paid",
      },
      {
        kind: "p",
        text: "Splitting a project is not free. Someone has to decide which package needs which skill, which packages run in parallel and which must wait, and which result counts as done. That is project management. On Bidception it is a funded role with a visible fee, instead of the sponsor doing it for free while the rest of the team ships.",
      },
      {
        kind: "h2",
        text: "What we are not claiming",
      },
      {
        kind: "p",
        text: "This model reduces coordination cost. It does not remove project management risk. A captain who misjudges a package budget fixes it from the reserve, not from thin air. We would not advertise otherwise.",
      },
      {
        kind: "callout",
        label: "Current status",
        text: "Parent projects can be created today. Funding for them uses the same money path as the rest of the network, and that path is not enabled yet, so funded projects do not appear on the site at the moment. The list page says so plainly.",
      },
      {
        kind: "links",
        items: [
          { label: "See team projects", to: "/bidception" },
          { label: "Start a project", to: "/bidception/new" },
          { label: "Back to the Bidception home", to: "/" },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // Bidthrone
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: "reputation-from-completed-work",
    product: "bidthrone",
    headline:
      "A portfolio tells you what someone says they did. We want the work record.",
    seoTitle: "Why Freelancer Reputation Should Be Based on Completed Work | Bidthrone",
    description:
      "Portfolios are curated. Testimonials are selective. Star averages hide context. Bidthrone builds public reputation from completed marketplace work: wins, deliveries, reviews, and the market rates they support.",
    publishedAt: DATE,
    modifiedAt: DATE,
    blocks: [
      {
        kind: "p",
        text: "When you choose a freelancer, you usually weigh three signals: a portfolio, a testimonial, and a star average. Each one is chosen by the person being judged.",
      },
      {
        kind: "p",
        text: "A portfolio shows selected work. Selection is the point of a portfolio. It tells you what someone wants you to see. A testimonial is a selected opinion, written by someone with a stake in the relationship. A star average compresses context into one number: a 4.8 from two reviews says almost nothing, and a 4.8 from two hundred says a lot, and most profiles never tell you which one it is.",
      },
      {
        kind: "h2",
        text: "A record instead of a claim",
      },
      {
        kind: "p",
        text: "Bidthrone is the public work record for the Bid Network. A member's profile shows outcomes the platform itself verified: bounties won, projects completed, teams captained, and reviews written by the people involved in that work. Both sides of a completed job can leave a review, and it is tied to that specific piece of work.",
      },
      {
        kind: "p",
        text: "The numbers come from the marketplace, not from the member. A completion appears when the work reaches its terminal state. Disputes are recorded next to the completion, so the record is not only a highlight reel.",
      },
      {
        kind: "p",
        text: "There is no rank you can buy. No placement fee, no featured slot, no input to the score that is not a completed outcome. The leaderboards compute live from those outcomes, and an empty board stays empty until real work lands.",
      },
      {
        kind: "h2",
        text: "What a reputation score is, and is not",
      },
      {
        kind: "p",
        text: "The score is a product-defined metric: verified completions, plus reliability, plus review quality. It is built to answer one question: who finishes work. It is not a claim of objective truth, and we would not describe it as one. A new member with one completed project has one data point of evidence. That is what the profile shows.",
      },
      {
        kind: "h2",
        text: "The Bid Index",
      },
      {
        kind: "p",
        text: "Market rates are the other discovery surface. The Bid Index aggregates settled outcomes per category and publishes a range and a median only when the sample reaches ten completed items. Below the threshold it says so, and publishes nothing. Individual deals are never exposed.",
      },
      {
        kind: "p",
        text: "The threshold is a privacy rule, not a marketing rule. Ten settled outcomes is the floor where an aggregate stops identifying anyone. A thin sample would guess, and a guess printed as a rate is worse than no rate.",
      },
      {
        kind: "callout",
        label: "Current status",
        text: "Profiles, leaderboards, the Bid Index, and Market rates are live. Because funding is not enabled yet, the verified-outcome data behind them is still forming, and the pages show exactly what exists: an honest zero until real work completes.",
      },
      {
        kind: "links",
        items: [
          { label: "See the leaderboards", to: "/leaderboards" },
          { label: "See the Bid Index (trust score)", to: "/bid-index" },
          { label: "Back to the Bidthrone home", to: "/" },
        ],
      },
    ],
  },
];

/**
 * @param {string} productKey
 * @returns {BlogArticle[]}
 */
export function articlesForProduct(productKey: ProductKey): BlogArticle[] {
  return BLOG_ARTICLES.filter((a) => a.product === productKey);
}

/**
 * @param {string} slug
 * @returns {BlogArticle | null}
 */
export function articleBySlug(slug: string): BlogArticle | null {
  return BLOG_ARTICLES.find((a) => a.slug === slug) ?? null;
}
