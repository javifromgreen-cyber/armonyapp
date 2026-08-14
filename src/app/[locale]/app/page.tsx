import { setRequestLocale } from "next-intl/server";
import { ExplorerApp } from "@/components/ExplorerApp";
import { AppBackToPlatform } from "@/components/platform/AppBackToPlatform";

export default async function AppShellPage({
  params,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <AppBackToPlatform />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ExplorerApp />
      </div>
    </main>
  );
}
