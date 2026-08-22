import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/sites";

export function manageHref(origin: string, site: string, token: string) {
  return `${origin.replace(/\/$/, "")}/${site}/manage/${token}`;
}

export function ManageLinkSave({
  href,
  email,
}: {
  href: string;
  email?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    toast.success(COPY.copied);
  }

  return (
    <div className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <p className="text-sm font-medium text-fg">{COPY.saveManage}</p>
      <p className="mt-3 break-all text-sm text-muted">{href}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copy()}>
          {copied ? COPY.copied : COPY.copyManage}
        </Button>
      </div>
      {email ? (
        <p className="mt-3 text-xs text-subtle">
          A copy of this link is also on the Cashfree payment receipt sent to {email}.
        </p>
      ) : (
        <p className="mt-3 text-xs text-subtle">
          There is no account recovery. If you lose this URL, the listing cannot be
          managed.
        </p>
      )}
    </div>
  );
}
