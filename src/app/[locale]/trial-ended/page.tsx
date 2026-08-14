import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";

export const metadata: Metadata = { title: "ONA — Trial ended" };

/**
 * Visual-only state for when an expired trial user opens an app
 * (product-spec.md §19). Reachable directly for design review; nothing
 * yet actually redirects here since real entitlement enforcement doesn't
 * exist in this phase.
 */
export default async function TrialEndedPage({
  params,
}: PageProps<"/[locale]/trial-ended">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("platform.trialEnded");

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-balance text-ona-fg">{t("headline")}</h1>
          <p className="mt-3 text-sm text-ona-fg-muted">{t("bodyIntro")}</p>
          <p className="mt-1 text-sm text-ona-fg-muted">{t("bodyCta")}</p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-ona-border p-4">
            <p className="text-base font-medium text-ona-fg">{t("monthly.price")}</p>
            <p className="mt-1 text-xs text-ona-fg-muted">{t("monthly.note")}</p>
          </div>
          <div className="rounded-xl border border-ona-border p-4">
            <p className="text-base font-medium text-ona-fg">{t("annual.price")}</p>
            <p className="mt-1 text-xs text-ona-fg-muted">{t("annual.note")}</p>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </button>

        <div className="flex gap-4 text-sm text-ona-fg-muted">
          <Link href="/" className="transition-colors hover:text-ona-fg">
            {t("backHome")}
          </Link>
          <Link href="/account" className="transition-colors hover:text-ona-fg">
            {t("backAccount")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
