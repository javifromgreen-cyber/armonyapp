import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ExplorerApp } from "@/components/ExplorerApp";
import { AppBackToPlatform } from "@/components/platform/AppBackToPlatform";
import { getPlatformAccess } from "@/platform/access";
import { decideAppAccess } from "@/domain/entitlements";

/**
 * Armony, now a genuinely protected ONA app (ONA Functional Phase 1). This
 * is the ONLY change to this file — `ExplorerApp` and everything under
 * `src/domain` are untouched (`decideAppAccess` is a small pure decision
 * function added in the hardening pass so this behavior is unit-testable
 * without mocking Next.js/Supabase — see
 * `src/domain/entitlements/appAccess.test.ts`; it does not perform the
 * redirect itself, so the actual production behavior is unchanged).
 * Enforcement happens here, server-side, before any Armony markup is
 * produced, so it cannot be bypassed by navigating directly to this URL:
 * unauthenticated visitors are sent to sign-in (carrying `returnTo=/app` so
 * they land back here after authenticating); authenticated visitors whose
 * trial has ended are sent to the Trial Ended experience, never shown
 * Armony.
 */
export default async function AppShellPage({
  params,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();
  const decision = decideAppAccess(access?.entitlements ?? null, "/app");
  if (decision.kind === "requireSignIn") {
    return redirect({
      href: { pathname: "/sign-in", query: { returnTo: decision.returnTo } },
      locale,
    });
  }
  if (decision.kind === "trialEnded") {
    return redirect({ href: "/trial-ended", locale });
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <AppBackToPlatform />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExplorerApp />
      </div>
    </main>
  );
}
