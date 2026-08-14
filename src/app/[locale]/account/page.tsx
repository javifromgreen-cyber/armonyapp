import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import { AccountStateCard } from "@/components/platform/account/AccountStateCard";
import { getMockAccount, isMockAccessStatus } from "@/platform/mockAccount";

export const metadata: Metadata = { title: "ONA — Account" };

/**
 * Visual-only Account page (product-spec.md §18). No real session exists,
 * so the access status shown is centralized mock data (`getMockAccount`).
 * An optional `?state=` override (trialing/monthly/annual/cancelled) lets
 * every documented visual state be reviewed on the same Vercel preview
 * without building a live in-UI switcher — a fresh sign-up defaults to
 * `trialing`.
 */
export default async function AccountPage({
  params,
  searchParams,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { state } = await searchParams;
  const requestedState = Array.isArray(state) ? state[0] : state;
  const account = getMockAccount(
    requestedState && isMockAccessStatus(requestedState) ? requestedState : "trialing",
  );

  const t = await getTranslations("platform.account");

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
            <AccountStateCard account={account} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium tracking-wide text-ona-fg-muted uppercase">
              {t("email")}
            </h2>
            <p className="text-ona-fg">{account.email}</p>
          </section>

          <button
            type="button"
            className="w-fit rounded-full border border-ona-border px-5 py-2 text-sm text-ona-fg-muted transition-colors hover:border-ona-fg-muted hover:text-ona-fg"
          >
            {t("signOut")}
          </button>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}
