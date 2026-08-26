import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CreditCard, Smartphone, Wallet } from "lucide-react";
import { confirmPayment, getOrder } from "@/lib/board-fns";
import { formatInr, formatPassDate, formatUsd, hostOf } from "@/lib/format";
import { rememberOwned } from "@/lib/owned";
import { COPY, isSiteId } from "@/lib/sites";
import { cn } from "@/lib/cn";
import { ManageLinkSave, manageHref } from "@/components/manage-link-save";
import { IndiaPaymentsNote } from "@/components/india-payments-note";
import type { PublicOrder } from "@/lib/types";

export const Route = createFileRoute("/$site/checkout/$orderId")({
  loader: ({ params }) => getOrder({ data: { orderId: params.orderId } }),
  component: CheckoutPage,
});

const METHODS = [
  { id: "upi", label: "UPI", Icon: Smartphone },
  { id: "card", label: "Card", Icon: CreditCard },
  { id: "netbanking", label: "Net banking", Icon: Building2 },
  { id: "wallet", label: "Wallet", Icon: Wallet },
] as const;

type CfWindow = Window & {
  Cashfree?: (opts: { mode: "sandbox" | "production" }) => {
    checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown>;
  };
};

function CheckoutPage() {
  const { site: siteParam, orderId } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");
  const [saved, setSaved] = useState<{ token?: string; passExpiresAt?: string } | null>(null);
  const initial = Route.useLoaderData();
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
    placeholderData: initial,
  });

  useEffect(() => {
    if (document.querySelector("script[data-cashfree-sdk]")) return;
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.dataset.cashfreeSdk = "true";
    document.head.appendChild(script);
  }, []);

  async function settle() {
    const result = await confirmPayment({ data: { orderId } });
    if (result.kind === "oracle") {
      setSaved({ passExpiresAt: result.passExpiresAt ?? undefined });
      toast.success("Oracle Pass active.");
      return;
    }
    if (!result.listing || !result.token) throw new Error("Payment settled, manage link missing.");
    rememberOwned({
      site: result.site,
      listingId: result.listing.id,
      token: result.token,
      title: result.listing.title,
    });
    toast.success(
      result.listing.rank
        ? `Live at rank ${result.listing.rank}.`
        : "Payment recorded.",
    );
    setSaved({ token: result.token });
  }

  async function pay(data: PublicOrder) {
    setBusy(true);
    try {
      if (!data.gatewayLive) {
        throw new Error("Cashfree checkout is not available for this order.");
      }
      const Cashfree = (window as CfWindow).Cashfree;
      if (!Cashfree) {
        throw new Error("Cashfree checkout is still loading. Wait a moment and try again.");
      }
      const cf = Cashfree({ mode: data.gatewayMode });
      const result = (await cf.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_modal",
      })) as { error?: { message?: string } } | undefined;
      if (result?.error) {
        throw new Error(result.error.message || "Payment was not completed.");
      }
      await settle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  const data = order.data;

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-kicker text-subtle">
        Cashfree Payments
      </p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight">
        Pay the rank
      </h1>
      <p className="mt-3 text-sm text-muted">
        Checkout is live Cashfree (INR). Rank updates only after Cashfree marks
        the order paid.
      </p>
      <IndiaPaymentsNote className="mt-4" />

      {order.isError ? (
        <p className="mt-8 text-danger">
          {order.error instanceof Error ? order.error.message : "Order missing."}
        </p>
      ) : null}

      {saved?.passExpiresAt ? (
        <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <p className="text-sm font-medium text-up">Oracle Pass is live.</p>
          <p className="mt-1 text-sm text-muted">
            Active until {formatPassDate(saved.passExpiresAt)} (UTC). Extra picks,
            5× points and crowd odds are on.
          </p>
          <Link
            to="/$site/crown"
            params={{ site }}
            className="mt-4 inline-block text-sm text-fg hover:underline"
          >
            Back to the crown →
          </Link>
        </div>
      ) : saved?.token ? (
        <div className="mt-8">
          <p className="text-sm text-up">Paid. The listing is live.</p>
          <ManageLinkSave href={manageHref(window.location.origin, site, saved.token)} />
          <Link
            to="/$site/manage/$token"
            params={{ site, token: saved.token }}
            className="mt-6 inline-block text-sm text-fg hover:underline"
          >
            Open the manage page
          </Link>
        </div>
      ) : data ? (
        data.status === "paid" ? (
          data.kind === "oracle" ? (
            <div className="mt-8">
              <p className="text-sm text-up">Oracle Pass is active.</p>
              <p className="mt-1 text-sm text-muted">
                This order was already paid.
              </p>
              <Link
                to="/$site/crown"
                params={{ site }}
                className="mt-4 inline-block text-sm text-fg hover:underline"
              >
                Back to the crown →
              </Link>
            </div>
          ) : (
            <p className="mt-8 text-sm text-up">
              Already paid on Cashfree. Open manage from your saved link.
            </p>
          )
        ) : !data.gatewayLive ? (
          <p className="mt-8 text-danger">
            {data.kind === "oracle"
              ? "Live Cashfree session missing. Go back and buy the pass again."
              : "Live Cashfree session missing. Go back and place the bid again."}
          </p>
        ) : (
          <CashfreePanel
            data={data}
            method={method}
            onMethod={setMethod}
            busy={busy}
            onPay={() => void pay(data)}
          />
        )
      ) : (
        <div className="mt-8 h-80 rounded-xl bg-surface shadow-[var(--shadow-border)]" />
      )}

      <Link
        to="/$site"
        params={{ site }}
        className="mt-6 inline-block text-sm text-muted hover:text-fg"
      >
        {COPY.backToBoard}
      </Link>
    </div>
  );
}

function CashfreePanel({
  data,
  method,
  onMethod,
  busy,
  onPay,
}: {
  data: PublicOrder;
  method: (typeof METHODS)[number]["id"];
  onMethod: (id: (typeof METHODS)[number]["id"]) => void;
  busy: boolean;
  onPay: () => void;
}) {
  return (
    <div
      data-gateway="cashfree"
      className="mt-8 overflow-hidden rounded-xl shadow-[var(--shadow-border)]"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <CashfreeMark />
          <span className="text-sm font-medium tracking-tight">cashfree</span>
        </div>
      </div>
      <div className="px-5 pb-5">
        <p className="text-xs uppercase tracking-wider cf-muted">Amount payable (INR)</p>
        <p className="mt-1 tabular text-3xl font-medium">{formatInr(data.inrRupees)}</p>
        <p className="mt-1 text-sm cf-muted">
          {data.kind === "oracle" ? "Oracle Pass" : "Board bid"} {formatUsd(data.amountCents)} · ₹
          {Number(data.inrPerUsd).toFixed(2)}/USD
          {data.fxSource === "live" ? " · live rate" : " · fallback rate"}
        </p>
        <p className="mt-1 text-sm cf-muted">
          {data.chargeLabel} · {data.title}
        </p>
        {data.url ? (
          <p className="mt-1 truncate text-xs cf-muted">{hostOf(data.url)}</p>
        ) : null}

        <dl className="mt-4 space-y-2 text-xs cf-muted">
          <div className="flex justify-between gap-3">
            <dt>Order</dt>
            <dd className="truncate tabular">{data.id}</dd>
          </div>
        </dl>

        <p className="mt-5 text-xs uppercase tracking-wider cf-muted">Pay with</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-on={method === item.id ? "true" : "false"}
              className={cn(
                "cf-method cf-line inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm",
                method === item.id ? "font-medium" : "cf-muted",
              )}
              onClick={() => onMethod(item.id)}
            >
              <item.Icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="cf-pay mt-5 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-medium disabled:opacity-50"
          disabled={busy}
          onClick={onPay}
        >
          {busy
            ? "Contacting Cashfree…"
            : `Pay ${formatInr(data.inrRupees)} · ${METHODS.find((m) => m.id === method)?.label}`}
        </button>
        <p className="mt-3 text-center text-xs cf-muted">
          PCI DSS · Powered by Cashfree Payments · India
        </p>
        <p className="mt-1 text-center text-xs cf-muted">
          FX via{" "}
          <a
            href="https://www.exchangerate-api.com"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Exchange Rate API
          </a>
        </p>
      </div>
    </div>
  );
}

function CashfreeMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--cf-accent)" />
      <path
        d="M8 8.5h5.2a3.8 3.8 0 0 1 0 7.6H8V8.5Zm2.1 1.8v4h3.1a2 2 0 0 0 0-4H10.1Z"
        fill="var(--cf-accent-fg)"
      />
    </svg>
  );
}
