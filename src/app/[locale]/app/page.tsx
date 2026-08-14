import { setRequestLocale } from "next-intl/server";
import { ExplorerApp } from "@/components/ExplorerApp";
import { PlatformBackLink } from "@/components/platform/PlatformBackLink";

export default async function AppShellPage({
  params,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <PlatformBackLink />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExplorerApp />
      </div>
    </main>
  );
}
