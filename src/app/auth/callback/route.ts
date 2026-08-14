import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { resolveSafeReturnTo } from "@/platform/safeReturnTo";
import { getPathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const DEFAULT_DESTINATION = "/account";

function isLocale(value: string | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * The single landing point for BOTH Supabase auth flows this phase supports
 * — Google OAuth and passwordless email — since both use the PKCE `code`
 * exchange. Lives outside the `[locale]` segment (it's a technical
 * redirect target, not a page) and is excluded from `src/proxy.ts`'s
 * matcher so next-intl never tries to rewrite it.
 *
 * `locale` and `returnTo` travel through the auth provider as query params
 * on THIS URL (set when the sign-in form calls `signInWithOAuth`/
 * `signInWithOtp`), since Supabase/Google only ever redirect back to
 * whatever `redirectTo`/`emailRedirectTo` was requested — there is no other
 * channel to carry that context through an external provider round-trip.
 * `returnTo` is re-validated here via `resolveSafeReturnTo` regardless — it
 * is untrusted input the same way a query param on any page would be.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const locale = isLocale(searchParams.get("locale")) ? searchParams.get("locale")! : undefined;
  const returnToParam = searchParams.get("returnTo") ?? undefined;
  const destination = resolveSafeReturnTo(returnToParam, DEFAULT_DESTINATION);

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const target = getPathname({ href: destination, locale: locale ?? "en" });
        return NextResponse.redirect(new URL(target, origin));
      }
    } catch (error) {
      // Falls through to the error redirect below — never a raw 500/stack trace to the visitor.
      console.error("Auth callback failed to exchange code for a session.", error);
    }
  }

  const signInPath = getPathname({ href: "/sign-in", locale: locale ?? "en" });
  const errorUrl = new URL(signInPath, origin);
  errorUrl.searchParams.set("authError", "1");
  if (returnToParam) errorUrl.searchParams.set("returnTo", returnToParam);
  return NextResponse.redirect(errorUrl);
}
