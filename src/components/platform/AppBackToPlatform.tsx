import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

/**
 * The standard exit/navigation element for EVERY ONA app (product-spec.md
 * §20), not just Armony — a small real ONA logo mark immediately followed
 * by "Back to ONA"/"Volver a ONA", the whole element a single link back to
 * the localized platform Home. Uses the `compact` (waveform-only) logo
 * variant, not the full lettering+waveform lockup — at this inline height
 * the full lockup isn't legible (confirmed in the earlier header-sizing
 * pass), which is exactly the scenario the compact mark exists for.
 *
 * Styled with generic semantic tokens (`border`/`foreground-muted`) that
 * every app is expected to define — the same convention Armony's own UI
 * already follows — never the platform shell's `.ona-shell` palette, so
 * this visually belongs to whichever app hosts it rather than importing
 * ONA's own colors into the app's page. Drop this into any future app's
 * page shell unchanged.
 */
export async function AppBackToPlatform() {
  const t = await getTranslations("platform.nav");

  return (
    <div className="flex shrink-0 items-center border-b border-border px-4 py-1.5 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-xs font-medium tracking-[0.06em] text-foreground-muted transition-colors hover:text-foreground"
      >
        <Logo variant="compact" heightPx={14} alt="" />
        {t("backToPlatform")}
      </Link>
    </div>
  );
}
