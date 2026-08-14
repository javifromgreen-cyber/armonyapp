import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HeroWave } from "../wave/HeroWave";

/** product-spec.md §8 — one CTA only, dark/artistic, ONA-as-platform not Armony-as-hero. */
export async function Hero() {
  const t = await getTranslations("platform.hero");

  return (
    <section className="relative overflow-hidden border-b border-ona-border bg-ona-bg">
      <HeroWave />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-28 text-center sm:py-36">
        <h1 className="text-4xl font-semibold tracking-tight text-balance text-ona-fg sm:text-5xl">
          {t("headline")}
        </h1>
        <p className="max-w-xl text-lg text-balance text-ona-fg-muted">{t("subtitle")}</p>
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
