import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionWave } from "../wave/SectionWave";
import { TRIAL_WAVE } from "../wave/wavePaths";

/** product-spec.md §12 — an elegant visual band, not a conversion funnel. */
export async function TrialSection() {
  const t = await getTranslations("platform.trial");

  return (
    <section className="relative overflow-hidden border-y border-ona-border bg-ona-surface px-6 py-16 sm:py-20">
      <SectionWave curve={TRIAL_WAVE} side="right" opacity={0.16} />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <h2 className="text-2xl font-semibold text-balance text-ona-fg sm:text-3xl">
          {t("headline")}
        </h2>
        <p className="max-w-xl text-ona-fg-muted">{t("body")}</p>
        <p className="text-sm text-ona-fg-muted">{t("steps")}</p>
        <Link
          href="/sign-in"
          className="mt-2 rounded-full bg-ona-accent px-7 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
