"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "../supabase/server";

/**
 * Real sign-out (ONA Functional Phase 1) — a Server Action so the session
 * cookie is actually cleared server-side, not just a client-side redirect
 * pretending to sign out. The account and its trial timestamps are
 * untouched in `platform_access`; signing back in restores the same state.
 */
export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("signOutAction failed to clear the Supabase session.", error);
  }

  const locale = await getLocale();
  redirect({ href: "/", locale });
}
