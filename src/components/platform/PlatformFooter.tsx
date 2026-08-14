import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";

/** Minimal footer (product-spec.md §15) — brand, three legal links, locale switcher. Nothing more. */
export async function PlatformFooter() {
  const t = await getTranslations("platform");

  return (
    <footer className="ona-shell border-t border-ona-border bg-ona-bg">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-sm sm:flex-row sm:justify-between">
        <Logo heightPx={32} />
        <nav className="flex flex-wrap items-center justify-center gap-6 text-ona-fg-muted">
          <Link href="/privacy" className="transition-colors hover:text-ona-fg">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ona-fg">
            {t("footer.terms")}
          </Link>
          <Link href="/cookies" className="transition-colors hover:text-ona-fg">
            {t("footer.cookies")}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </footer>
  );
}
