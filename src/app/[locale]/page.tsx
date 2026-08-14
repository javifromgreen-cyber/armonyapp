import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import { Hero } from "@/components/platform/home/Hero";
import { IntroSection } from "@/components/platform/home/IntroSection";
import { ToolsCatalogue } from "@/components/platform/home/ToolsCatalogue";
import { TrialSection } from "@/components/platform/home/TrialSection";
import { PricingSection } from "@/components/platform/home/PricingSection";
import { FinalCta } from "@/components/platform/home/FinalCta";

export const metadata: Metadata = {
  title: "ONA",
  description: "Visual tools to explore, understand and create music.",
};

export default async function PlatformHomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="ona-shell flex min-h-full flex-col bg-ona-bg text-ona-fg">
      <PlatformHeader variant="public" />
      <main className="flex-1">
        <Hero />
        <IntroSection />
        <ToolsCatalogue />
        <TrialSection />
        <PricingSection />
        <FinalCta />
      </main>
      <PlatformFooter />
    </div>
  );
}
