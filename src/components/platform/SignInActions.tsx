"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/platform/supabase/client";

type Step = "choose" | "email" | "sent";

/**
 * The two real auth actions ONA supports (product-spec.md — ONA Functional
 * Phase 1): Google OAuth and passwordless email, both via Supabase's
 * `@supabase/ssr` browser client. Deliberately a client component — OAuth
 * must navigate the current window to the provider, which only the browser
 * can do. Both flows redirect through the SAME `/auth/callback` route
 * (`buildCallbackUrl`), carrying `locale`/`returnTo` as query params since
 * an external provider round-trip has no other channel to preserve them.
 */
export function SignInActions({
  returnTo,
  hasAuthError = false,
}: {
  returnTo?: string;
  hasAuthError?: boolean;
}) {
  const t = useTranslations("platform.signIn");
  const locale = useLocale();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(hasAuthError ? t("errorAuth") : null);

  function buildCallbackUrl(): string {
    const url = new URL("/auth/callback", window.location.origin);
    url.searchParams.set("locale", locale);
    if (returnTo) url.searchParams.set("returnTo", returnTo);
    return url.toString();
  }

  async function handleGoogle() {
    setError(null);
    setIsPending(true);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: buildCallbackUrl() },
    });
    // On success the browser navigates away to Google — nothing further to do here.
    if (oauthError) {
      setError(t("errorGeneric"));
      setIsPending(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildCallbackUrl() },
    });
    setIsPending(false);
    if (otpError) {
      setError(t("errorGeneric"));
      return;
    }
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-ona-fg">{t("checkEmailHeadline")}</h2>
        <p className="text-sm text-ona-fg-muted">{t("checkEmailBody", { email })}</p>
      </div>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-3">
        <label className="flex flex-col gap-1 text-left">
          <span className="text-xs font-medium text-ona-fg-muted">{t("emailLabel")}</span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            className="rounded-full border border-ona-border bg-transparent px-4 py-2.5 text-sm text-ona-fg outline-none focus-visible:ring-2 focus-visible:ring-ona-accent"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("sendLink")}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("choose");
            setError(null);
          }}
          disabled={isPending}
          className="text-xs text-ona-fg-muted transition-colors hover:text-ona-fg disabled:cursor-not-allowed"
        >
          {t("back")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isPending}
        className="w-full rounded-full bg-ona-accent px-5 py-3 text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("continueWithGoogle")}
      </button>
      <button
        type="button"
        onClick={() => setStep("email")}
        disabled={isPending}
        className="w-full rounded-full border border-ona-border px-5 py-3 text-sm font-medium text-ona-fg transition-colors hover:border-ona-fg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("continueWithEmail")}
      </button>
    </div>
  );
}
