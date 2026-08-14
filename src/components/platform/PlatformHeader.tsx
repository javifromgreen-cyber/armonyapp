import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoLink } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav, type MobileNavItem } from "./MobileNav";

/**
 * Public vs. logged-in visual state (product-spec.md §5-6). No real session
 * exists yet, so callers pick the variant explicitly per page rather than
 * this component deriving it from auth state — swapping in real auth later
 * only means choosing the variant dynamically at the same call sites.
 */
export async function PlatformHeader({ variant }: { variant: "public" | "loggedIn" }) {
  const t = await getTranslations("platform");

  const appsItem: MobileNavItem = { href: "/#tools", label: t("nav.apps") };
  const pricingItem: MobileNavItem = { href: "/#pricing", label: t("nav.pricing") };
  const secondaryItem: MobileNavItem =
    variant === "loggedIn"
      ? { href: "/account", label: t("nav.account") }
      : { href: "/sign-in", label: t("nav.signIn") };
  const primaryAction: MobileNavItem = { href: "/sign-in", label: t("nav.tryFree") };

  return (
    <header className="ona-shell sticky top-0 z-40 border-b border-ona-border bg-ona-bg/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <LogoLink />

        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/#tools"
            className="text-sm text-ona-fg-muted transition-colors hover:text-ona-fg"
          >
            {t("nav.apps")}
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-ona-fg-muted transition-colors hover:text-ona-fg"
          >
            {t("nav.pricing")}
          </Link>
          <LocaleSwitcher />
          <Link
            href={secondaryItem.href}
            className="text-sm text-ona-fg-muted transition-colors hover:text-ona-fg"
          >
            {secondaryItem.label}
          </Link>
          {variant === "public" && (
            <Link
              href="/sign-in"
              className="rounded-full bg-ona-accent px-5 py-2 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
            >
              {t("nav.tryFree")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4 lg:hidden">
          <LocaleSwitcher />
          <MobileNav
            items={[appsItem, pricingItem, secondaryItem]}
            primaryAction={primaryAction}
            openLabel={t("nav.openMenu")}
            closeLabel={t("nav.closeMenu")}
          />
        </div>
      </div>
    </header>
  );
}
