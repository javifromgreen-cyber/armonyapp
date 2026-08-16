import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";

export const metadata: Metadata = { title: "ONA — Checkout cancelled" };

/**
 * Stripe's `cancel_url` destination (ONA Functional Phase 2) — purely
 * informational; no billing state is read or changed here, since nothing
 * happened on the Stripe side to reflect.
 */
export default async function BillingCancelPage({
  params,
}: PageProps<"/[locale]/billing/cancel">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("platform.billing.cancel");

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-balance text-ona-fg">{t("title")}</h1>
          <p className="mt-3 text-sm text-ona-fg-muted">{t("body")}</p>
        </div>

        <div className="flex gap-4 text-sm text-ona-fg-muted">
          <Link href="/#pricing" className="transition-colors hover:text-ona-fg">
            {t("ctaPricing")}
          </Link>
          <Link href="/account" className="transition-colors hover:text-ona-fg">
            {t("ctaAccount")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
