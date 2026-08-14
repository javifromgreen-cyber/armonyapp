import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";

export const metadata: Metadata = { title: "ONA — Sign in" };

/**
 * Visual-only sign-in/trial-start screen (product-spec.md §17). No real
 * auth backend — both actions are structured as the future intended
 * destination (Account, carrying the same `from` app id) so the routing
 * shape is already correct once Google/email auth is wired in.
 */
export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { from } = await searchParams;

  const t = await getTranslations("platform.signIn");

  return (
    <AuthShell>
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-ona-fg">{t("headline")}</h1>
          <p className="mt-2 text-sm text-ona-fg-muted">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Link
            href={{ pathname: "/account", query: from ? { from } : undefined }}
            className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("continueWithGoogle")}
          </Link>
          <Link
            href={{ pathname: "/account", query: from ? { from } : undefined }}
            className="w-full rounded-full border border-ona-border px-5 py-3 text-sm font-medium text-ona-fg transition-colors hover:border-ona-fg-muted"
          >
            {t("continueWithEmail")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
