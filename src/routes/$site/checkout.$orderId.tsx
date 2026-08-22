import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmPayment, getOrder } from "@/lib/board-fns";
import { formatUsd, hostOf } from "@/lib/format";
import { rememberOwned } from "@/lib/owned";
import { COPY, isSiteId } from "@/lib/sites";

export const Route = createFileRoute("/$site/checkout/$orderId")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { site: siteParam, orderId } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
  });

  async function pay() {
    setBusy(true);
    try {
      const result = await confirmPayment({ data: { orderId } });
      if (!result.token) throw new Error("Payment settled, manage link missing.");
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
      await navigate({
        to: "/$site/manage/$token",
        params: { site: result.site, token: result.token },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  const data = order.data;

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-[0.2em] text-subtle">Cashfree checkout</p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight">Pay the rank</h1>
      <p className="mt-3 text-sm text-muted">{COPY.checkoutDemo}</p>

      {order.isError ? (
        <p className="mt-8 text-danger">
          {order.error instanceof Error ? order.error.message : "Order missing."}
        </p>
      ) : null}

      {data ? (
        <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <dl className="space-y-3 text-sm">
            <Row label="Order" value={data.id} />
            <Row label="Kind" value={data.chargeLabel} />
            <Row label="Listing" value={data.title} />
            <Row label="URL" value={hostOf(data.url) || data.url} />
            <Row label="Amount" value={formatUsd(data.amountCents)} strong />
            <Row label="Status" value={data.status} />
          </dl>
          {data.status === "paid" ? (
            <p className="mt-6 text-sm text-up">Already paid. Open manage from your saved link.</p>
          ) : (
            <Button className="mt-6 w-full" disabled={busy} onClick={() => void pay()}>
              {busy ? "Settling…" : `${COPY.payCashfree} · ${formatUsd(data.amountCents)}`}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 h-64 rounded-xl bg-surface shadow-[var(--shadow-border)]" />
      )}

      <p className="mt-6 text-xs text-subtle">
        Production webhook: Cashfree `order.paid` hits `/api/webhooks/cashfree`,
        verifies the signature, and runs the same settle path as this button.
      </p>
      <Link to="/$site" params={{ site }} className="mt-4 inline-block text-sm text-muted hover:text-fg">
        {COPY.backToBoard}
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-subtle">{label}</dt>
      <dd className={strong ? "tabular font-medium" : "truncate tabular text-right"}>{value}</dd>
    </div>
  );
}
