import { useState } from "react";
import { createReviewFn } from "@/lib/marketplace/reviews";
import { Field, Input, Textarea } from "./field";

/**
 * Network Spine (RC3): the post-completion review form, shared by bounty and
 * project detail pages (both directions of verified work). Reviews are tied
 * to the specific completed job — the engine enforces that, not this form.
 */
export function ReviewBox({
  workType,
  workId,
  direction,
  onDone,
}: {
  workType: "BOUNTY" | "PROJECT";
  workId: string;
  direction: "SPONSOR_TO_PROVIDER" | "PROVIDER_TO_SPONSOR";
  onDone: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <form
      className="mt-8 border-t border-fg/10 pt-6"
      data-testid="review-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) => {
          const v = Number(f.get(k));
          return v >= 1 && v <= 5 ? v : undefined;
        };
        setBusy(true);
        const r = await createReviewFn({
          data: {
            workType,
            workId,
            direction,
            quality: num("quality"),
            communication: num("communication"),
            timeliness: num("timeliness"),
            clarity: num("clarity"),
            body: String(f.get("body") ?? ""),
          },
        });
        setBusy(false);
        if (r.ok) {
          onDone("Review saved. Thank you.");
          setDone(true);
        } else {
          onDone(r.message);
        }
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">
        {direction === "SPONSOR_TO_PROVIDER" ? "Review the winning builder" : "Review the sponsor"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Both sides rate the work that just completed, on this specific job. The scores feed the public record.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {(["quality", "communication", "timeliness", "clarity"] as const).map((k) => (
          <Field key={k} label={`${k[0].toUpperCase()}${k.slice(1)} (1–5)`} id={`rv-${k}`}>
            <Input id={`rv-${k}`} name={k} type="number" min={1} max={5} className="tabular" />
          </Field>
        ))}
      </div>
      <div className="mt-4">
        <Field label="How did the work go?" id="rv-body">
          <Textarea id="rv-body" name="body" rows={3} maxLength={4000} placeholder="What worked, what didn't." />
        </Field>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex h-10 items-center rounded-sm bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}
