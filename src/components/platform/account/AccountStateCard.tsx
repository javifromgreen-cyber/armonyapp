import { getFormatter, getTranslations } from "next-intl/server";
import type { EntitlementStatus } from "@/domain/entitlements";
import type { BillingSnapshot } from "@/platform/access";
import { GoProOptions } from "@/components/platform/billing/GoProOptions";

/**
 * Renders the real access-status card (ONA Functional Phase 1, extended in
 * Phase 2 with real Stripe Pro state). `status === "active"` means Pro
 * access via `billing` (see `src/platform/access/getPlatformAccess.ts`);
 * `trialing`/`expired` render the original trial-only cards, now with real
 * Checkout wired in via `GoProOptions` instead of Phase 1's inert
 * placeholder button. No live countdown anywhere: exact date/time only,
 * formatted through next-intl.
 */
export async function AccountStateCard({
  status,
  trialEndsAt,
  billing,
}: {
  status: EntitlementStatus;
  trialEndsAt: Date;
  billing: BillingSnapshot | null;
}) {
  const t = await getTranslations("platform.account");
  const format = await getFormatter();

  if (status === "active" && billing) {
    return <ProCard billing={billing} />;
  }

  const date = format.dateTime(trialEndsAt, { dateStyle: "long" });
  const time = format.dateTime(trialEndsAt, { timeStyle: "short" });

  if (status === "trialing") {
    return (
      <StateCard title={t("trial.title")}>
        <p className="text-ona-fg-muted">{t("trial.endsAt", { date, time })}</p>
        <div className="mt-3">
          <GoProOptions namespace="platform.account.goPro" />
        </div>
      </StateCard>
    );
  }

  return (
    <StateCard title={t("expired.title")}>
      <p className="text-ona-fg-muted">{t("expired.endedAt", { date, time })}</p>
      <p className="text-ona-fg-muted">{t("expired.body")}</p>
      <div className="mt-3">
        <GoProOptions namespace="platform.account.goPro" />
      </div>
    </StateCard>
  );
}

async function ProCard({ billing }: { billing: BillingSnapshot }) {
  const t = await getTranslations("platform.account");
  const format = await getFormatter();
  const plan = billing.plan ?? "monthly";
  const periodEndDate = billing.currentPeriodEnd
    ? format.dateTime(billing.currentPeriodEnd, { dateStyle: "long" })
    : null;

  return (
    <StateCard title={t(`${plan}.title`)}>
      <p className="text-ona-fg-muted">{t(`${plan}.price`)}</p>
      {periodEndDate && (
        <p className="text-ona-fg-muted">
          {plan === "monthly"
            ? t("monthly.nextCharge", { date: periodEndDate })
            : t("annual.accessUntil", { date: periodEndDate })}
        </p>
      )}
      {billing.cancelAtPeriodEnd && periodEndDate && (
        <>
          <p className="text-ona-fg-muted">{t("cancelled.accessUntil", { date: periodEndDate })}</p>
          <p className="text-ona-fg-muted">{t("cancelled.willNotRenew")}</p>
        </>
      )}
      {billing.subscriptionStatus === "past_due" && (
        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="font-medium text-ona-fg">{t("pastDue.title")}</p>
          <p className="text-ona-fg-muted">{t("pastDue.body")}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-ona-fg-muted">{t("manageNote")}</p>
      <a
        href="https://link.com"
        target="_blank"
        rel="noreferrer"
        className="mt-1 w-fit text-sm font-medium text-ona-accent transition-opacity hover:opacity-80"
      >
        {t(`${plan}.manage`)}
      </a>
    </StateCard>
  );
}

function StateCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ona-border bg-ona-surface p-6">
      <h3 className="mb-3 text-lg font-semibold text-ona-fg">{title}</h3>
      <div className="flex flex-col gap-2 text-sm">{children}</div>
    </div>
  );
}
