import type { SiteId } from "@/lib/sites";
import { SITES } from "@/lib/sites";

export const LEGAL_SLUGS = ["terms", "privacy", "refund", "contact"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string | undefined): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value ?? "");
}

export const LEGAL_NAV: { slug: LegalSlug; label: string }[] = [
  { slug: "terms", label: "Terms" },
  { slug: "privacy", label: "Privacy" },
  { slug: "refund", label: "Refund" },
  { slug: "contact", label: "Contact" },
];

export function contactEmail(site: SiteId) {
  return `contact@${SITES[site].domain}`;
}

type Block = { heading?: string; body: string[] };

export function legalDoc(site: SiteId, slug: LegalSlug): {
  title: string;
  updated: string;
  intro: string;
  blocks: Block[];
} {
  const cfg = SITES[site];
  const email = contactEmail(site);
  const updated = "22 August 2026";

  if (slug === "terms") {
    return {
      title: "Terms of service",
      updated,
      intro: `These terms govern use of ${cfg.domain}. Payments are processed by Cashfree. By placing a bid, paying a swap fee, or using a manage link, you agree to them.`,
      blocks: [
        {
          heading: "The service",
          body: [
            `${cfg.name} is a public pay-to-rank board. Rank is determined solely by the highest total bid, in whole US dollars, with a minimum of $5. There is no editorial ranking, no free slot, and no algorithm beyond bid amount and time of bid.`,
            site === "founders"
              ? "Listings are for founding-team pages, about pages, studio sites, and personal founder URLs. The founding names you submit are published on the board."
              : site === "culture"
                ? "Listings are for company culture, careers, and why-join-us pages. Culture statements, values, and optional quotes you submit are published on the board."
                : "Listings are for marketing platforms, directories, pay-to-rank tools, newsletter sponsorship boards, and community visibility products. The short note you submit is published on the board.",
          ],
        },
        {
          heading: "Accounts and manage links",
          body: [
            "We do not issue accounts, passwords, or logins. After a successful payment, Cashfree checkout returns you to a secret manage URL. That URL is the only key to re-bid or swap. If you lose it, we cannot restore access from an email or name — we do not store those.",
          ],
        },
        {
          heading: "Payments",
          body: [
            "All charges are processed by Cashfree Payments. Board ranks are priced in USD; checkout currently collects the INR equivalent through Indian payment methods only (UPI, cards, netbanking, wallets). International / global gateways will be added later. A new listing is charged the full bid. A re-bid on the same URL is charged only the difference to the new total. A URL swap is charged the full swap fee for that swap number (see the Rules page), then clamped between $10 and $2,500.",
            "An order is complete when Cashfree marks it paid. Rank updates only after that.",
          ],
        },
        {
          heading: "No refunds",
          body: [
            "Bids, re-bids, and swap fees are final once paid. See the Refund policy. Chargebacks or payment disputes may result in the listing being removed from the board.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Do not list illegal content, malware, phishing, or pages that impersonate another person or company. We may remove a listing that breaks the law or these terms without a refund. We do not moderate for taste or quality.",
          ],
        },
        {
          heading: "No results guarantee",
          body: [
            "Buying or holding a rank does not guarantee visits, clicks, leads, applications, hires, sales, conversions, or any other outcome. Traffic and attention depend on visitors, your page, and factors outside our control. Someone else can outbid you at any time.",
            "Site-level visit and view figures on the boards are not a promise of traffic. Rank is never based on those figures — only on bid amount.",
          ],
        },
        {
          heading: "Liability",
          body: [
            `${cfg.domain} is provided as-is, without warranties of merchantability, fitness for a particular purpose, or uninterrupted availability. Rank is a paid public ordering, not an endorsement of any listing, company, or page.`,
            "We are not liable for lost manage links, downtime, outbids, chargebacks, third-party payment processor issues, or how a visitor reads a listing. To the maximum extent allowed by law, our aggregate liability for any claim related to the service is limited to the amount you paid us for the relevant order in the thirty days before the claim.",
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
      intro: `${cfg.domain} is built without user accounts. This policy describes what little we store and what Cashfree processes when you pay.`,
      blocks: [
        {
          heading: "What we store",
          body: [
            "Public listing data: URL, title, tagline, team or quote, culture values, bid amount, rank, click count, swap count, and timestamps. This is shown on the board.",
            "A secret manage token, issued at payment, used only to prove control of that listing. It is not an email, name, or login.",
            "Order records needed to settle Cashfree payments: amount, kind (bid or swap), status, and payment identifiers from Cashfree.",
            "We do not create accounts. We do not store names, emails, phone numbers, or passwords. Click counts are incremented without storing IP addresses as a profile.",
          ],
        },
        {
          heading: "Optional email on the bid form",
          body: [
            "The bid form lets you optionally enter an email so Cashfree can put the manage link on the payment receipt. That address is forwarded to Cashfree for that checkout only. We do not save it in our database, and we cannot look up or restore a manage link from an email later.",
          ],
        },
        {
          heading: "What stays on your device",
          body: [
            "This browser may keep a list of listings you paid for (so “your listings” can link back to the manage URL) and your light/dark preference. That data does not leave the device unless you copy the manage link yourself.",
          ],
        },
        {
          heading: "Cashfree Payments",
          body: [
            "Card, UPI, net banking, and wallet details are entered on Cashfree’s checkout. We do not see or store full card numbers. Cashfree’s own privacy policy applies to that checkout. We receive payment status and order identifiers so we can rank the listing.",
          ],
        },
        {
          heading: "Contact email",
          body: [
            `If you write to ${email}, we use that message only to reply. We do not add you to a marketing list.`,
          ],
        },
        {
          heading: "Retention and requests",
          body: [
            "Public bids remain on the board while the listing exists. You can ask " +
              email +
              " to remove a listing you control (prove it with the manage link). We will not refund the bid.",
          ],
        },
      ],
    };
  }

  if (slug === "refund") {
    return {
      title: "Refund policy",
      updated,
      intro: "No refunds. Read this before you pay.",
      blocks: [
        {
          heading: "All paid charges are final",
          body: [
            `Once Cashfree marks an order paid, the charge is non-refundable. That includes new listing bids, re-bid differences, and URL swap fees on ${cfg.domain}.`,
            "Rank is a public, paid position. Buying it is not a trial, not a subscription you can cancel, and not a product that can be returned.",
          ],
        },
        {
          heading: "What we will not refund",
          body: [
            "A listing that is outbid later.",
            "A manage link you lost or leaked.",
            "A URL you later want to change — use a paid swap instead.",
            "A bid placed in error, at the wrong amount, or on the wrong URL.",
            "Fees Cashfree charged as part of checkout.",
          ],
        },
        {
          heading: "Payment failures and duplicates",
          body: [
            "If Cashfree does not mark the order paid, you are not ranked and not charged by us. If two paid events arrive for the same order, we settle once.",
          ],
        },
        {
          heading: "Chargebacks",
          body: [
            "A dispute or chargeback on a paid bid or swap may get the listing taken down. It does not restore a manage link or a previous rank.",
          ],
        },
        {
          heading: "Contact",
          body: [
            `Payment questions: ${email}. Include the Cashfree order id from checkout. We still do not issue refunds.`,
          ],
        },
      ],
    };
  }

  return {
    title: "Contact",
    updated,
    intro: `Write to ${email}. There is no phone line, no chat, and no login to open a ticket.`,
    blocks: [
      {
        heading: "Email",
        body: [
          site === "founders"
            ? "contact@foundersbid.lol — the only address for foundersbid.lol."
            : site === "culture"
              ? "contact@culturebid.lol — the address for culturebid.lol. Foundersbid remains contact@foundersbid.lol."
              : "contact@bidception.lol — the address for bidception.lol. Foundersbid remains contact@foundersbid.lol. Culturebid remains contact@culturebid.lol.",
          "Say what you need in the subject: listing, payment, or legal.",
        ],
      },
      {
        heading: "What to include",
        body: [
          "For a payment: Cashfree order id, amount, and the listing URL.",
          "For a listing you control: the manage URL (or enough of the token that we can match it). Do not post that URL in public.",
          "We cannot reset a manage link from an email — optional checkout emails are forwarded to Cashfree only and are not stored by us.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Checkout is Cashfree Payments. Card and UPI issues that happen on Cashfree's page are also Cashfree's to diagnose. We can confirm whether our order is paid or pending.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Do not write for a refund of a paid bid or swap. The refund policy is no refunds.",
        ],
      },
    ],
  };
}
