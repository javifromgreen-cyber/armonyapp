import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";
import { GoProOptions } from "@/components/platform/billing/GoProOptions";
import { getPlatformAccess } from "@/platform/access";

export const metadata: Metadata = { title: "ONA — Trial ended" };

/**
 * Where `/app` sends an authenticated, expired visitor (ONA Functional
 * Phase 2 wires real Checkout here via `GoProOptions`; the page itself was
 * visual-only in Phase 1). Also reachable directly by URL, so it handles
 * both cases a visitor could arrive in that a pure redirect target
 * wouldn't: signed out (send to sign-in, carrying `returnTo=/trial-ended`
 * so they land back here — the same pattern every other Pro entry point
 * uses) and already-Pro (nothing to upsell — send to Account instead).
 */
export default async function TrialEndedPage({
  params,
}: PageProps<"/[locale]/trial-ended">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();
  if (!access) {
    return redirect({
      href: { pathname: "/sign-in", query: { returnTo: "/trial-ended" } },
      locale,
    });
  }
  if (access.entitlements.status === "active") {
    return redirect({ href: "/account", locale });
  }

  const t = await getTranslations("platform.trialEnded");

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-balance text-ona-fg">{t("headline")}</h1>
          <p className="mt-3 text-sm text-ona-fg-muted">{t("bodyIntro")}</p>
          <p className="mt-1 text-sm text-ona-fg-muted">{t("bodyCta")}</p>
        </div>

        <GoProOptions namespace="platform.trialEnded" />

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
