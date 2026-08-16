import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";
import { getPlatformAccess } from "@/platform/access";

export const metadata: Metadata = { title: "ONA — Checkout complete" };

/**
 * Stripe's `success_url` destination (ONA Functional Phase 2) — a
 * confirmation screen only, never a source of truth for entitlement. Per
 * the phase's own security rule, arriving here (even with a real Stripe
 * `session_id` query param, which this page deliberately doesn't read) is
 * NEVER treated as proof of payment: the only thing that ever grants Pro
 * access is the webhook-synced `platform_billing` row
 * (`src/app/api/stripe/webhook/route.ts`), read here purely for DISPLAY via
 * the normal `getPlatformAccess()` path — nothing on this page writes
 * anything. Webhook delivery can lag the redirect back from Stripe by a
 * few seconds, so this shows a "confirming" message rather than assuming
 * failure if Pro isn't visible yet.
 */
export default async function BillingSuccessPage({
  params,
}: PageProps<"/[locale]/billing/success">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();
  const t = await getTranslations("platform.billing.success");
  const isActive = access?.entitlements.status === "active";

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-balance text-ona-fg">{t("title")}</h1>
          <p className="mt-3 text-sm text-ona-fg-muted">{isActive ? t("active") : t("confirming")}</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/account"
            className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("ctaAccount")}
          </Link>
          {isActive && (
            <Link
              href="/app"
              className="w-full rounded-full border border-ona-border px-5 py-3 text-sm font-medium text-ona-fg transition-colors hover:border-ona-fg-muted"
            >
              {t("ctaApp")}
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
