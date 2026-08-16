"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { BillingPlan } from "@/domain/entitlements";

/**
 * Starts real Stripe Checkout for an already-authenticated, Pro-eligible
 * visitor (ONA Functional Phase 2) — POSTs `{ plan, locale }` to
 * `/api/stripe/checkout` (which resolves `plan` to a trusted Price ID
 * server-side; this component never sees or sends a raw Price ID) and
 * redirects the browser to the Stripe-hosted Checkout URL it returns.
 * Deliberately never called for a signed-out visitor — callers
 * (`GoProOptions`, `PricingSection`) render a sign-in `Link` with
 * `returnTo` instead in that case, reusing the existing auth pattern
 * rather than this component silently failing with a 401.
 */
export function CheckoutButton({
  plan,
  label,
  className,
}: {
  plan: BillingPlan;
  label: string;
  className: string;
}) {
  const locale = useLocale();
  const t = useTranslations("platform.billing");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, locale }),
      });

      if (response.status === 409) {
        setErrorMessage(t("alreadySubscribed"));
        setStatus("error");
        return;
      }
      if (!response.ok) {
        throw new Error("checkout_failed");
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("checkout_failed");
      }
      window.location.href = data.url;
    } catch {
      setErrorMessage(t("checkoutError"));
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleClick} disabled={status === "loading"} className={className}>
        {status === "loading" ? t("startingCheckout") : label}
      </button>
      {status === "error" && errorMessage && (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
