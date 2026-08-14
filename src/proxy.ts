import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { refreshSupabaseSession } from "@/platform/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

/**
 * Composes next-intl's locale routing with a Supabase session refresh
 * (product-spec.md — ONA Functional Phase 1) on every matched request, so a
 * Server Component never sees a stale access token (Server Components can
 * read cookies but not write them — this is the one place in the request
 * lifecycle that can). Order matters: the Supabase refresh runs first
 * against the raw request, then next-intl produces its own routing
 * response, then the refreshed session cookies are layered onto THAT
 * response — works whether next-intl returns a redirect or a pass-through.
 */
export default async function proxy(request: NextRequest) {
  const sessionCookies = await refreshSupabaseSession(request);
  const response = intlMiddleware(request);

  for (const { name, value, options } of sessionCookies) {
    response.cookies.set(name, value, options);
  }

  return response;
}

export const config = {
  // `/auth/*` (OAuth/email callback Route Handlers) is intentionally excluded —
  // it's outside the `[locale]` segment and must never be locale-rewritten.
  matcher: ["/((?!api|auth|trpc|_next|_vercel|.*\\..*).*)"],
};
