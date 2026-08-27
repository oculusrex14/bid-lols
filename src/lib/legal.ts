import { product, type ProductKey } from "@/lib/host";

/**
 * Pre-launch legal copy per product domain (Phase 00.5, WS1).
 *
 * These pages describe ONLY what the currently deployed application does:
 * public pre-launch pages, the founding-access capture, and host-level page
 * analytics. They make explicit that marketplace transactions are not yet
 * available and that no payment is accepted. No legacy product language
 * remains anywhere in public copy (AC-1.1), and no final marketplace terms
 * are invented (those are specified separately before Phase 01 opens
 * transactions).
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
      return "FoundersBid will be the network's startup execution product: funded work for founders, from development to go-to-market.";
    case "culturebid":
      return "CultureBid will be the network's creative bounty product: funded creative briefs with fair, capped competition.";
    case "bidception":
      return "Bidception will be the network's nested, team-based bounty product: one funded problem, decomposed into funded pieces a team works together.";
    case "bidthrone":
    default:
      return "Bidthrone is the network's reputation and discovery layer.";
  }
}

export function legalDoc(productKey: ProductKey, slug: LegalSlug): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  const cfg = product(productKey);
  const email = contactEmail(productKey);
  const updated = "26 August 2026";

  if (slug === "terms") {
    return {
      title: "Terms of service",
      updated,
      intro: `These terms govern use of ${cfg.apex}, part of the Bid Network. By using the site you agree to them.`,
      blocks: [
        {
          heading: "The service today",
          body: [
            `${cfg.name} is part of the Bid Network — an internet bounty network that is being built. Today the site offers: public pages describing what each network product will do, a founding-access request form, and internal page analytics. Nothing else.`,
            productIntent(productKey),
            "The marketplace is not live. Bounties and projects cannot yet be listed, funded, competed on, or paid out. No payment of any kind is accepted on this site today.",
            "Content marked EXAMPLE or DEMO is illustrative. It is not an offer, not a real transaction, and not evidence of any activity.",
          ],
        },
        {
          heading: "Founding access",
          body: [
            "The founding-access form collects your email address, your role or intention, which site of the network you submitted from, and your consent to be contacted. We use it only to contact you about early access. We do not sell or share it.",
            "Submitting the form creates no account and grants no entitlement. When access opens, it is at our discretion and may be limited in size or scope.",
          ],
        },
        {
          heading: "Future terms",
          body: [
            "Terms for marketplace transactions — bounties, projects, payouts, and disputes — will be specified and published before any transactions are enabled. They are not implied by this page.",
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

  if (slug === "privacy") {
    return {
      title: "Privacy policy",
      updated,
      intro: `${cfg.apex} has no account system and accepts no payment. This policy describes the limited data the current pre-launch site actually collects.`,
      blocks: [
        {
          heading: "What we collect",
          body: [
            "Page analytics: we count page views, visits, and outbound link clicks per site. These are aggregate counts. We do not store device identifiers or anything that identifies you personally in the analytics.",
            `Founding access: if you submit the form, we store your email address; your role or intention; which site of the network you submitted from (derived from the domain you were on, not from anything you type); when you submitted; and the consent you gave. We use this only to contact you about founding access.`,
            "On your device: your browser may keep your appearance choice (light/dark) and a per-session flag so a visit is counted once. That data stays on your device.",
            "Hosting: the site runs on Vercel. Vercel may independently process request information (such as hosting logs and performance data) as hosting infrastructure, under its own privacy policy.",
          ],
        },
        {
          heading: "Transient IP processing (founding access form)",
          body: [
            "When you submit the founding-access form, the app may temporarily process your IP address in memory for abuse prevention and rate limiting. It is not persisted to our application database, and it is not used for advertising or profiling.",
          ],
        },
        {
          heading: "What we do not collect",
          body: [
            "No names, no phone numbers, no passwords, no payment data, no advertising cookies, no third-party analytics or tracking scripts, and no IP addresses in our database.",
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

  if (slug === "refund") {
    return {
      title: "Refund & payment policy",
      updated,
      intro: "No payment of any kind is accepted on this site today. There is nothing to buy, no checkout, and no payment method can be entered.",
      blocks: [
        {
          heading: "Future payments",
          body: [
            "When the marketplace opens, payment and refund terms will be specified and published before any payment flow is enabled. They will not be inferred from this page.",
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

  return {
    title: "Contact",
    updated,
    intro: `Write to ${email}. There is no phone line, no chat, and no ticket system.`,
    blocks: [
      {
        heading: "Email",
        body: [
          productKey === "foundersbid"
            ? "contact@foundersbid.lol — the address for foundersbid.lol."
            : productKey === "culturebid"
              ? "contact@culturebid.lol — the address for culturebid.lol."
              : productKey === "bidception"
                ? "contact@bidception.lol — the address for bidception.lol."
                : "contact@bidthrone.lol — the address for the Bid Network umbrella.",
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
