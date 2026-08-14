import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/platform/LegalPage";

export const metadata: Metadata = { title: "ONA — Cookies" };

export default async function CookiesPage({ params }: PageProps<"/[locale]/cookies">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.legal.cookies");
  return <LegalPage title={t("title")} body={t("body")} />;
}
