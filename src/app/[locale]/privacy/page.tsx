import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/platform/LegalPage";

export const metadata: Metadata = { title: "ONA — Privacy" };

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.legal.privacy");
  return <LegalPage title={t("title")} body={t("body")} />;
}
