import { getFormatter, getTranslations } from "next-intl/server";
import type { MockAccount } from "@/platform/mockAccount";

/**
 * Renders the per-status visual documented in product-spec.md §18. No live
 * countdown anywhere (explicitly forbidden by the spec) — exact date/time
 * only, formatted through next-intl so it's already locale-correct.
 */
export async function AccountStateCard({ account }: { account: MockAccount }) {
  const t = await getTranslations("platform.account");
  const format = await getFormatter();
  const date = new Date(account.date);

  switch (account.status) {
    case "trialing":
      return (
        <StateCard title={t("trial.title")}>
          <p className="text-ona-fg-muted">
            {t("trial.endsAt", {
              date: format.dateTime(date, { dateStyle: "long" }),
              time: format.dateTime(date, { timeStyle: "short" }),
            })}
          </p>
          <UpgradeButton label={t("trial.cta")} />
        </StateCard>
      );
    case "monthly":
      return (
        <StateCard title={t("monthly.title")}>
          <p className="text-ona-fg">{t("monthly.price")}</p>
          <p className="text-ona-fg-muted">
            {t("monthly.nextCharge", { date: format.dateTime(date, { dateStyle: "long" }) })}
          </p>
          <ManageButton label={t("monthly.manage")} />
        </StateCard>
      );
    case "annual":
      return (
        <StateCard title={t("annual.title")}>
          <p className="text-ona-fg">{t("annual.price")}</p>
          <p className="text-ona-fg-muted">
            {t("annual.accessUntil", { date: format.dateTime(date, { dateStyle: "long" }) })}
          </p>
          <ManageButton label={t("annual.manage")} />
        </StateCard>
      );
    case "cancelled":
      return (
        <StateCard title={t("cancelled.title")}>
          <p className="text-ona-fg-muted">
            {t("cancelled.accessUntil", { date: format.dateTime(date, { dateStyle: "long" }) })}
          </p>
          <p className="text-ona-fg-muted">{t("cancelled.willNotRenew")}</p>
        </StateCard>
      );
  }
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

function ManageButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="mt-3 w-fit rounded-full border border-ona-border px-5 py-2 text-sm font-medium text-ona-fg transition-colors hover:border-ona-fg-muted"
    >
      {label}
    </button>
  );
}
