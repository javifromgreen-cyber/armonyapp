import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * The only ONA presence inside Armony itself (product-spec.md §20) — a
 * single discreet wordmark link back to the platform Home. Deliberately
 * styled with Armony's OWN existing tokens (border/foreground-muted), not
 * the `.ona-shell` palette: this lives inside Armony's page, not the
 * platform shell, and must not crowd or restyle Armony's toolbar.
 */
export async function PlatformBackLink() {
  const t = await getTranslations("platform.nav");

  return (
    <div className="flex shrink-0 items-center border-b border-border px-4 py-1.5 sm:px-6">
      <Link
        href="/"
        className="text-xs font-medium tracking-[0.1em] text-foreground-muted transition-colors hover:text-foreground"
      >
        {t("backToPlatform")}
      </Link>
    </div>
  );
}
