import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import { AccountStateCard } from "@/components/platform/account/AccountStateCard";
import { getPlatformAccess } from "@/platform/access";
import { signOutAction } from "@/platform/auth/signOutAction";

export const metadata: Metadata = { title: "ONA — Account" };

/**
 * Real Account page (ONA Functional Phase 1) — the mocked
 * `getMockAccount`/`?state=` override is gone; every value here comes from
 * `getPlatformAccess()`, which reads the authenticated Supabase user and
 * their `platform_access` row. Deliberately minimal, per product-spec.md
 * §18-19: access status, email, sign out — nothing else yet.
 */
export default async function AccountPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();
  if (!access) {
    return redirect({ href: { pathname: "/sign-in", query: { returnTo: "/account" } }, locale });
  }

  const t = await getTranslations("platform.account");
  const status = access.entitlements.status === "expired" ? "expired" : "trialing";

  return (
    <div className="ona-shell flex min-h-full flex-col bg-ona-bg text-ona-fg">
      <PlatformHeader variant="loggedIn" />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto flex max-w-md flex-col gap-8">
          <h1 className="text-2xl font-semibold text-ona-fg">{t("title")}</h1>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-ona-fg-muted uppercase">
              {t("accessStatus")}
            </h2>
            <AccountStateCard status={status} trialEndsAt={access.trialEndsAt} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-ona-fg-muted uppercase">
              {t("email")}
            </h2>
            <p className="text-ona-fg">{access.email}</p>
          </section>

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-fit rounded-full border border-ona-border px-5 py-2 text-sm text-ona-fg-muted transition-colors hover:border-ona-fg-muted hover:text-ona-fg"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
