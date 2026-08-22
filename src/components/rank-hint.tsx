import { formatUsd } from "@/lib/format";
import { MIN_BID_DOLLARS } from "@/lib/sites";
import { cn } from "@/lib/cn";

export function RankHint({
  amountDollars,
  leaderBidCents,
  className,
}: {
  amountDollars: number | null;
  leaderBidCents: number;
  className?: string;
}) {
  if (amountDollars == null || !Number.isInteger(amountDollars)) {
    return (
      <p className={cn("text-xs text-subtle", className)}>Whole dollars only.</p>
    );
  }
  if (amountDollars < MIN_BID_DOLLARS) {
    return (
      <p className={cn("text-xs text-subtle", className)}>Minimum $5. Whole dollars only.</p>
    );
  }

  const leader = Math.round((leaderBidCents ?? 0) / 100);
  if (leader < 1) {
    return (
      <p className={cn("text-xs text-subtle", className)}>
        {amountDollars <= MIN_BID_DOLLARS
          ? "Five dollars puts you first."
          : "Open board. Highest bid stands first."}
      </p>
    );
  }

  if (amountDollars > leader) {
    return (
      <p className={cn("text-xs text-subtle", className)}>
        {amountDollars === leader + 1
          ? `One dollar above ${formatUsd(leaderBidCents)}.`
          : `Takes #1. Current leader is ${formatUsd(leaderBidCents)}.`}
      </p>
    );
  }

  return (
    <p className={cn("text-sm text-danger", className)} role="status">
      {amountDollars === leader
        ? `This matches the leader at ${formatUsd(leaderBidCents)}. Rank goes to whoever reached it first — you will sit below #1.`
        : `You have bid below the leader (${formatUsd(leaderBidCents)}). You will be ranked below accordingly.`}
    </p>
  );
}
