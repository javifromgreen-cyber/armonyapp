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
import { getPlatformAccess } from "@/platform/access";

export const metadata: Metadata = {
  title: "ONA",
  description: "Visual tools to explore, understand and create music.",
};

export default async function PlatformHomePage({
  params,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = await getPlatformAccess();

  return (
    <div className="ona-shell flex min-h-full flex-col bg-ona-bg text-ona-fg">
      <PlatformHeader variant={access ? "loggedIn" : "public"} />
      <main className="flex-1">
        <Hero />
        <IntroSection />
        <ToolsCatalogue access={access} />
        <TrialSection />
        <PricingSection isAuthenticated={!!access} isPro={access?.entitlements.status === "active"} />
        <FinalCta />
      </main>
      <PlatformFooter />
    </div>
  );
}
