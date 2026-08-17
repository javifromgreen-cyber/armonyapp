import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppBackToPlatform } from "@/components/platform/AppBackToPlatform";
import { TuningExplorerApp } from "@/components/tuningExplorer/TuningExplorerApp";
import { getPlatformAccess } from "@/platform/access";
import { decideAppAccess } from "@/domain/entitlements";

export const metadata: Metadata = { title: "ONA — Tuning Explorer" };

/**
 * Tuning Explorer, ONA app #2 (product spec — a sibling to Armony, not a
 * sub-feature of it: this is deliberately its OWN top-level route,
 * `/tuning-explorer`, rather than nesting under `/app` — `/app` already IS
 * Armony's own product route, and nesting a second, unrelated app under it
 * would incorrectly imply Tuning Explorer is part of Armony. See
 * `docs/architecture.md` for the full routing rationale).
 *
 * Access control is IDENTICAL to Armony's (`src/app/[locale]/app/page.tsx`)
 * — the same `getPlatformAccess()` + `decideAppAccess()` pair, since
 * Tuning Explorer uses the exact same platform-wide trial/Pro entitlement,
 * never an app-specific trial or purchase. Adding this route to
 * `src/platform/tools.ts` automatically extends the `returnTo` allowlist
 * (`src/platform/safeReturnTo.ts` builds it from `platformTools`), so no
 * separate allowlist edit was needed.
 */
export default async function TuningExplorerPage({
  params,
}: PageProps<"/[locale]/tuning-explorer">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();
  const decision = decideAppAccess(access?.entitlements ?? null, "/tuning-explorer");
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
        <TuningExplorerApp />
      </div>
    </main>
  );
}
