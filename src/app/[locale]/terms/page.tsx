import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/platform/LegalPage";

export const metadata: Metadata = { title: "ONA — Terms" };

export default async function TermsPage({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.legal.terms");
  return <LegalPage title={t("title")} body={t("body")} />;
}
