import { getTranslations } from "next-intl/server";

/** Short editorial intro (product-spec.md §9) — no icon grid, no stats, no filler. */
export async function IntroSection() {
  const t = await getTranslations("platform.intro");

  return (
    <section className="bg-ona-bg px-6 py-16 sm:py-20">
      <p className="mx-auto max-w-2xl text-center text-xl text-balance text-ona-fg sm:text-2xl">
        {t("body")}
      </p>
    </section>
  );
}
