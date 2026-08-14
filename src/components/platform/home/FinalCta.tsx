import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** product-spec.md §14 — visually strong but minimal, one headline, one CTA. */
export async function FinalCta() {
  const t = await getTranslations("platform.finalCta");

  return (
    <section className="bg-ona-bg px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-semibold text-balance text-ona-fg sm:text-4xl">
          {t("headline")}
        </h2>
        <Link
          href="/sign-in"
          className="rounded-full bg-ona-accent px-7 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
