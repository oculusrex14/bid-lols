/**
 * Legal copy (terms / privacy / refund / contact) — single source, host-aware.
 * RC3 (S-11): the document builders are split out of one 200-line function;
 * the published text itself is unchanged (legal.test.ts pins its claims).
 */
import { product, type ProductKey } from "@/lib/host";

/**
 * Pre-launch legal copy per product domain (Phase 00.5, WS1; RC3 S-11 split
 * into per-document builders — the published text is unchanged).
 *
 * These pages describe ONLY what the currently deployed application does:
 * public marketplace pages, the blog, member accounts, public profiles,
 * leaderboards, the Bid Index, the launch-updates capture, and internal
 * page analytics. They make explicit that no payment of any kind is
 * accepted yet. No legacy product language remains in public copy.
 */

export const LEGAL_SLUGS = ["terms", "privacy", "refund", "contact"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string | undefined): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value ?? "");
}

export const LEGAL_NAV: { slug: LegalSlug; label: string }[] = [
  { slug: "terms", label: "Terms" },
  { slug: "privacy", label: "Privacy" },
  { slug: "refund", label: "Refund & payments" },
  { slug: "contact", label: "Contact" },
];

export function contactEmail(productKey: ProductKey) {
  return product(productKey).contactEmail;
}

type Block = { heading?: string; body: string[] };

/** What this domain will become, in one honest sentence each. */
function productIntent(productKey: ProductKey): string {
  switch (productKey) {
    case "foundersbid":
      return "FoundersBid is the network's startup-work product: bounded development, design, research and marketing problems, funded and deadline-bounded.";
    case "culturebid":
      return "CultureBid will be the network's creative bounty product: funded creative briefs with fair, capped competition.";
    case "bidception":
      return "Bidception will be the network's nested, team-based bounty product: one funded problem, decomposed into funded pieces a team works together.";
    case "bidthrone":
    default:
      return "Bidthrone is the network's reputation and discovery layer.";
  }
}

const UPDATED = "28 August 2026";

export function legalDoc(productKey: ProductKey, slug: LegalSlug): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  const cfg = product(productKey);
  const email = cfg.contactEmail;
  switch (slug) {
    case "terms":
      return termsDoc(cfg, email);
    case "privacy":
      return privacyDoc(cfg, email);
    case "refund":
      return refundDoc(email);
    default:
      return contactDoc(productKey, email);
  }
}

function termsDoc(cfg: ReturnType<typeof product>, email: string): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  return {
    title: "Terms of service",
    updated: UPDATED,
    intro: `These terms govern use of ${cfg.apex}, part of the Bid Network. By using the site you agree to them.`,
    blocks: [
      {
        heading: "The service today",
        body: [
          `${cfg.name} is part of the Bid Network, an internet bounty network. Today the site offers: public marketplace pages (bounties, projects, the graveyard, and team projects), the blog, member accounts, public profiles, leaderboards, the Bid Index, the launch-updates request form, and internal page analytics.`,
          productIntent(cfg.key as ProductKey),
          "Members can create accounts, build profiles, and prepare a bounty, project, or team project in draft. Drafting is free. Publishing a draft to the open marketplace requires funding, and funding is NOT yet enabled: no payment of any kind is accepted on this site today, and no bounty or project can become publicly open while payments are disabled.",
          "Content marked EXAMPLE or DEMO is illustrative. It is not an offer, not a real transaction, and not evidence of any activity.",
        ],
      },
      {
        heading: "Launch updates form",
        body: [
          "The launch-updates form (labeled \"Launch updates\" on the site; internally the founding-access capture) collects your email address, your role or intention, which site of the network you submitted from, and your consent to be contacted. We use it only to contact you about early access. We do not sell or share it.",
          "Submitting the form creates no account and grants no entitlement. When access opens, it is at our discretion and may be limited in size or scope.",
        ],
      },
      {
        heading: "Marketplace rules (operational draft)",
        body: [
          "These marketplace rules are the platform's operational draft. They are structured for professional legal review and take effect only when marketplace payments are enabled; until then no transaction obligations exist. Where a numbered rule and this page conflict, the numbered rule published at the time of funding governs that transaction.",
          "MODE A — BOUNTIES. A bounty is a funded, bounded problem that multiple qualified members may compete on. A sponsor defines the work, deliverables, acceptance criteria, deadlines, participant cap, qualification rules, and a published reward structure (winner-takes-all, podium, or finalist pool). The advertised reward is funded before the bounty opens; the advertised amounts are exactly what winners receive, and the platform's service fee is charged to the sponsor on top — it is never deducted from advertised rewards. Once an approved participant has begun work, the sponsor cannot unilaterally cancel: cancellation goes to dispute resolution, and eligible participants are compensated from the funded pool before any refund is made.",
          "MODE B — PROJECTS. A project is posted as a brief. Providers respond with proposals (approach, relevant experience and evidence, a quoted amount, a timeline, and a milestone plan) before any deliverable work is done. Proposals must not include completed deliverable work. The sponsor selects one provider; funding of the quoted amount (plus the disclosed service fee) is required before work begins; work runs through the published milestones.",
          "REVIEWS. After a bounty or project genuinely completes, the sponsor and the winning/selected provider may review each other. Reviews are tied to that specific completed work and cannot be created for work that did not happen.",
        ],
      },
      {
        heading: "Disputes (operational draft)",
        body: [
          "A dispute is reviewed manually by the platform — there is no automated adjudication. Either verified counterparty of a funded work can open a dispute with a reason and evidence. Disputes move through OPEN, UNDER REVIEW, RESOLVED, and CLOSED states, and every administrative action on a dispute is recorded in an internal audit trail.",
          "Where a dispute is resolved with a monetary outcome (full or partial settlement, refund, or cancellation), the outcome is applied to the funded amount — never to the advertised reward of other participants.",
        ],
      },
      {
        heading: "Intellectual property (operational draft)",
        body: [
          "BOUNTIES: ownership or licensing of a winning deliverable transfers according to the rules published on the bounty, and only once the related reward obligation has been satisfied. Non-winning submissions remain the property of their authors, except the limited rights needed to evaluate the submission and to operate the competition.",
          "PROJECTS: deliverable IP transfers according to the project's published terms as the related milestones are approved and paid. Neither party acquires rights to the other's pre-existing property.",
          "The platform never takes ownership of member work beyond what these published rules require, and reputation is derived only from verified marketplace outcomes — it cannot be bought.",
        ],
      },
      {
        heading: "Accounts",
        body: [
          "Creating an account requires a valid email address and a password (handled by our authentication provider; we never see or store your raw password). You are responsible for activity under your account. We may suspend accounts for fraud, abuse, payment misrepresentation, or violations of these terms — recorded in our audit trail.",
          "Money-facing actions (funding a bounty or project, receiving payouts) additionally require a verified email address. Until email delivery is configured on the platform, verification is performed manually by platform administrators and recorded.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not submit false or abusive content, attempt to access systems you are not authorized to use, submit the founding-access form at abusive volume, or scrape the site. We may refuse or end use of the site for violations.",
        ],
      },
      {
        heading: "No guarantees",
        body: [
          "The site is provided as-is, without warranties of any kind. Nothing here promises when — or whether — the marketplace will launch, or what it will offer.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the maximum extent permitted by law, we are not liable for indirect or consequential damages. Our aggregate liability for any claim relating to this site is limited to amounts you paid us in the thirty days before the claim — which is none, because no payments are accepted today.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms; the date above is the latest revision. Continued use after a change means you accept the updated terms.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions: ${email}`],
      },
    ],
  };
}

function privacyDoc(cfg: ReturnType<typeof product>, email: string): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  return {
    title: "Privacy policy",
    updated: UPDATED,
    intro: `${cfg.apex} is part of the Bid Network and accepts no payment of any kind today. This policy describes the data the site actually collects.`,
    blocks: [
      {
        heading: "What we collect",
        body: [
          "Accounts: if you create an account, we store your email address, a password hash (handled by our authentication provider; we never see or store your raw password), your display name, and your session identifiers so you stay signed in.",
          "Public profile: if you set one up, we store the fields you choose to publish: handle, bio, skills, categories, links, availability, and optional company details. These appear on your public profile page.",
          "Marketplace data: the drafts, applications, proposals, submissions, and (once funding is enabled) payment records you create are stored with the marketplace features.",
          "Page analytics: we count page views, visits, and outbound link clicks per site. These are aggregate counts. We do not store device identifiers or anything that identifies you personally in the analytics.",
          `Launch updates: if you submit the form, we store your email address; your role or intention; which site of the network you submitted from (derived from the domain you were on, not from anything you type); when you submitted; and the consent you gave. We use this only to contact you about early access.`,
          "On your device: your browser may keep your appearance choice (light/dark) and a per-session flag so a visit is counted once. That data stays on your device.",
          "Hosting: the site runs on Vercel. Vercel may independently process request information (such as hosting logs and performance data) as hosting infrastructure, under its own privacy policy.",
        ],
      },
      {
        heading: "Transient IP processing (launch updates form)",
        body: [
          "When you submit the founding-access form, the app may temporarily process your IP address in memory for abuse prevention and rate limiting. It is not persisted to our application database, and it is not used for advertising or profiling.",
        ],
      },
      {
        heading: "What we do not collect",
        body: [
          "No phone numbers, no raw passwords (the authentication provider stores a hash, we never see the password itself), no payment data, no advertising cookies, no third-party analytics or tracking scripts, and no IP addresses in our application database. Your display name and profile details are collected only because you choose to set them.",
        ],
      },
      {
        heading: "Contact email",
        body: [
          `If you write to ${email}, we use that address only to reply. We do not add senders to marketing lists.`,
        ],
      },
      {
        heading: "Retention and requests",
        body: [
          `To correct or delete your founding-access entry, write to ${email} with the address you used. We will delete it on request.`,
        ],
      },
      {
        heading: "Changes",
        body: [
          "If what we collect changes, this page is updated and the date above changes with it.",
        ],
      },
      {
        heading: "Contact",
        body: [`Privacy questions: ${email}`],
      },
    ],
  };
}

function refundDoc(email: string): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  return {
    title: "Refund & payment policy",
    updated: UPDATED,
    intro: "No payment of any kind is accepted on this site today. There is nothing to buy, no checkout, and no payment method can be entered.",
    blocks: [
      {
        heading: "When payments open (operational draft)",
        body: [
          "These refund terms are the platform's operational draft for marketplace payments; they take effect only when marketplace payments are enabled and will be finalized before any payment flow is enabled.",
          "BOUNTY FUNDING. The sponsor pays the advertised reward plus a disclosed service fee. If a bounty is cancelled before any approved participant has begun work, the full reward obligation (and the service fee) is refunded. If work has begun, cancellation is resolved through the dispute process: eligible participants are compensated from the funded pool first, and only the remainder is refundable. Once winners are paid, funded rewards are not refundable.",
          "PROJECT FUNDING. Approved milestones are paid to the provider on approval. Unapproved or cancelled milestone funds refund to the sponsor after dispute resolution; in-progress work is compensated according to the dispute resolution.",
          "Refunds are recorded in the platform's money ledger and audit trail. Refund timing depends on the payment provider's own processing windows; the platform never reports a refund as complete without the provider confirming it.",
        ],
      },
      {
        heading: "No payments today",
        body: [
          "Payments are not yet enabled: no payment method can be entered. Funding a listing is impossible until the platform enables payments — at which point these terms, finalized, will govern it.",
        ],
      },
      {
        heading: "Past payments",
        body: [
          "If a payment was initiated on this domain by an earlier version of the service, it remains under the terms in effect at the time. Write to " +
            email +
            " with your payment reference to ask for its status.",
          "Do not send new payments for earlier versions of the service — this site cannot process them.",
        ],
      },
      {
        heading: "Contact",
        body: [`Payment questions: ${email}`],
      },
    ],
  };
}

function contactDoc(productKey: ProductKey, email: string): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  return {
    title: "Contact",
    updated: UPDATED,
    intro: `Write to ${email}. There is no phone line, no chat, and no ticket system.`,
    blocks: [
      {
        heading: "Email",
        body: [
          `contact@${productKey}.lol — ${
            productKey === "bidthrone"
              ? "the address for the Bid Network umbrella."
              : `the address for ${productKey}.lol.`
          }`,
          "Say what you need in the subject.",
        ],
      },
      {
        heading: "What to include",
        body: [
          "For a founding-access request: the email address you used in the form.",
          "For a question about a past payment: your payment reference and the date.",
        ],
      },
      {
        heading: "Response time",
        body: [
          "We answer in the order messages arrive. Before launch, some responses may take a few days.",
        ],
      },
    ],
  };
}
