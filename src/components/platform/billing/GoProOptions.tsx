"use client";

import { useTranslations } from "next-intl";
import { CheckoutButton } from "./CheckoutButton";

/**
 * The shared monthly/annual "go Pro" card pair (ONA Functional Phase 2) —
 * used by the Trial Ended page and the Account page's non-Pro states, so
 * the real Checkout wiring exists in exactly one place. `namespace` must
 * point at a message namespace shaped like `{ monthly: { price, note, cta
 * }, annual: { price, note, cta } }` (see `platform.trialEnded` and
 * `platform.account.goPro` in messages/*.json).
 */
export function GoProOptions({ namespace }: { namespace: "platform.trialEnded" | "platform.account.goPro" }) {
  const t = useTranslations(namespace);

  return (
    <div className="grid w-full grid-cols-2 gap-3 text-left">
      <PlanCard
        price={t("monthly.price")}
        note={t("monthly.note")}
        cta={t("monthly.cta")}
        plan="monthly"
      />
      <PlanCard price={t("annual.price")} note={t("annual.note")} cta={t("annual.cta")} plan="annual" />
    </div>
  );
}

function PlanCard({
  price,
  note,
  cta,
  plan,
}: {
  price: string;
  note: string;
  cta: string;
  plan: "monthly" | "annual";
}) {
  return (
    <div className="rounded-xl border border-ona-border p-4">
      <p className="text-base font-medium text-ona-fg">{price}</p>
      <p className="mt-1 text-xs text-ona-fg-muted">{note}</p>
      <CheckoutButton
        plan={plan}
        label={cta}
        className="mt-3 w-full rounded-full bg-ona-accent px-4 py-2 text-xs font-medium text-ona-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
