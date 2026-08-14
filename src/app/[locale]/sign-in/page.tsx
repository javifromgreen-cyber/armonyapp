import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";
import { resolveSafeReturnTo } from "@/platform/safeReturnTo";

export const metadata: Metadata = { title: "ONA — Sign in" };

const DEFAULT_DESTINATION = "/account";

/**
 * Visual-only sign-in/trial-start screen (product-spec.md §17/§20). No real
 * auth backend — both mock actions land on a `returnTo` destination
 * (validated against the platform's own known app routes by
 * `resolveSafeReturnTo`, never trusted blindly): arriving from an app's
 * "Try now" sends the user back to that app after mock sign-in; arriving
 * from the header's plain "Sign in" (no `returnTo`) lands on Account, same
 * as today. The routing shape is already correct once real Google/email
 * auth is wired in.
 */
export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { returnTo } = await searchParams;
  const returnToValue = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const destination = resolveSafeReturnTo(returnToValue, DEFAULT_DESTINATION);

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
            href={destination}
            className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
          >
            {t("continueWithGoogle")}
          </Link>
          <Link
            href={destination}
            className="w-full rounded-full border border-ona-border px-5 py-3 text-sm font-medium text-ona-fg transition-colors hover:border-ona-fg-muted"
          >
            {t("continueWithEmail")}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
