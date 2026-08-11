import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function AppShellPage({
  params,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("app.shell");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-foreground-muted">{t("comingSoon")}</p>
    </main>
  );
}
