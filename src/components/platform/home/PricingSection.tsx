"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type BillingPeriod = "monthly" | "annual";

/**
 * product-spec.md §13 — a single Pro tier; monthly/annual are billing
 * periods of the SAME access, never separate feature tiers. Client
 * component only because of the local toggle state.
 */
export function PricingSection() {
  const t = useTranslations("platform.pricing");
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  return (
    <section id="pricing" className="scroll-mt-20 bg-ona-bg px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-2xl border border-ona-border bg-ona-surface p-8 text-center">
        <div>
          <h2 className="text-2xl font-semibold text-ona-fg">{t("title")}</h2>
          <p className="mt-1 text-sm text-ona-fg-muted">{t("tagline")}</p>
        </div>

        <div
          role="group"
          aria-label={t("title")}
          className="inline-flex rounded-full border border-ona-border p-1 text-sm"
        >
          <BillingToggleButton
            isActive={period === "monthly"}
            onClick={() => setPeriod("monthly")}
            label={t("billing.monthly")}
          />
          <BillingToggleButton
            isActive={period === "annual"}
            onClick={() => setPeriod("annual")}
            label={t("billing.annual")}
          />
        </div>

        {period === "monthly" ? (
          <div>
            <p className="text-3xl font-semibold text-ona-fg">{t("monthly.price")}</p>
            <p className="mt-2 text-sm text-ona-fg-muted">{t("monthly.note")}</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-semibold text-ona-fg">{t("annual.price")}</p>
            <p className="mt-2 text-sm text-ona-fg-muted">{t("annual.note")}</p>
            <p className="text-sm text-ona-fg-muted">{t("annual.equivalent")}</p>
          </div>
        )}

        <Link
          href="/sign-in"
          className="w-full rounded-full bg-ona-accent px-6 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </Link>
        <p className="text-xs text-ona-fg-muted">{t("secondary")}</p>
      </div>
    </section>
  );
}

function BillingToggleButton({
  isActive,
  onClick,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`rounded-full px-4 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ona-accent ${
        isActive ? "bg-ona-accent text-ona-accent-foreground" : "text-ona-fg-muted hover:text-ona-fg"
      }`}
    >
      {label}
    </button>
  );
}
