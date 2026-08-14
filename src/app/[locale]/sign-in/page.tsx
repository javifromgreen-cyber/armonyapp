import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "@/components/platform/AuthShell";
import { SignInActions } from "@/components/platform/SignInActions";
import { resolveSafeReturnTo } from "@/platform/safeReturnTo";
import { getPlatformAccess } from "@/platform/access";

export const metadata: Metadata = { title: "ONA — Sign in" };

const DEFAULT_DESTINATION = "/account";

/**
 * Real sign-in/trial-start screen (ONA Functional Phase 1). One screen
 * serves both a brand-new visitor (their 72-hour trial starts the moment
 * Supabase creates their `auth.users` row — see
 * `supabase/migrations/20260814120000_platform_access.sql`'s trigger) and a
 * returning one (same account, same trial, restored). `returnTo` is
 * validated by `resolveSafeReturnTo` and threaded through
 * `SignInActions` -> `/auth/callback` so both Google OAuth and passwordless
 * email land back on the right destination.
 */
export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { returnTo, authError } = await searchParams;
  const returnToValue = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const destination = resolveSafeReturnTo(returnToValue, DEFAULT_DESTINATION);

  // Already signed in — sending them back through the sign-in screen would
  // be confusing (and, for Google, would trigger a redundant OAuth round
  // trip), so resolve the same safe destination immediately server-side.
  const access = await getPlatformAccess();
  if (access) {
    return redirect({ href: destination, locale });
  }

  const t = await getTranslations("platform.signIn");

  return (
    <AuthShell>
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-ona-fg">{t("headline")}</h1>
          <p className="mt-2 text-sm text-ona-fg-muted">{t("subtitle")}</p>
        </div>
        <SignInActions returnTo={returnToValue} hasAuthError={authError === "1"} />
      </div>
    </AuthShell>
  );
}
