import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function MarketingHomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("marketing");
  const common = await getTranslations("common");
  const loopSteps = ["explore", "understand", "hear", "play", "compose"] as const;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
      <span className="text-sm font-medium tracking-wide text-accent">
        {common("brand")}
      </span>
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="text-lg text-foreground-muted text-balance">
          {t("hero.subtitle")}
        </p>
      </div>
      <ol className="flex flex-wrap items-center justify-center gap-2 text-sm text-foreground-muted">
        {loopSteps.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-3 py-1">
              {t(`loop.${step}`)}
            </span>
            {index < loopSteps.length - 1 && (
              <span aria-hidden className="text-border">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <Link
        href="/app"
        className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        {common("startFree")}
      </Link>
    </main>
  );
}
