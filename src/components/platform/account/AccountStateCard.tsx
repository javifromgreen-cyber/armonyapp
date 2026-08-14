import { getFormatter, getTranslations } from "next-intl/server";

/**
 * Renders the real access-status card (ONA Functional Phase 1). Only two
 * states exist yet — `trialing`/`expired`, matching
 * `src/domain/entitlements`'s current real output — the monthly/annual/
 * cancelled translation keys stay reserved in the message files for the
 * future billing phase but are not read here. No live countdown anywhere:
 * exact date/time only, formatted through next-intl.
 */
export async function AccountStateCard({
  status,
  trialEndsAt,
}: {
  status: "trialing" | "expired";
  trialEndsAt: Date;
}) {
  const t = await getTranslations("platform.account");
  const format = await getFormatter();
  const date = format.dateTime(trialEndsAt, { dateStyle: "long" });
  const time = format.dateTime(trialEndsAt, { timeStyle: "short" });

  if (status === "trialing") {
    return (
      <StateCard title={t("trial.title")}>
        <p className="text-ona-fg-muted">{t("trial.endsAt", { date, time })}</p>
        <UpgradeButton label={t("trial.cta")} />
      </StateCard>
    );
  }

  return (
    <StateCard title={t("expired.title")}>
      <p className="text-ona-fg-muted">{t("expired.endedAt", { date, time })}</p>
      <p className="text-ona-fg-muted">{t("expired.body")}</p>
      <UpgradeButton label={t("expired.cta")} />
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

function UpgradeButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="mt-3 w-fit rounded-full bg-ona-accent px-5 py-2 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
    >
      {label}
    </button>
  );
}
