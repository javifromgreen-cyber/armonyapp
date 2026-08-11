import { setRequestLocale } from "next-intl/server";
import { ExplorerApp } from "@/components/ExplorerApp";

export default async function AppShellPage({
  params,
}: PageProps<"/[locale]/app">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <ExplorerApp />
    </main>
  );
}
