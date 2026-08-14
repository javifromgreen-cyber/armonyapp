import { platformTools } from "./tools";

/**
 * Mock-auth "return to the app you came from" destination (product-spec.md
 * §17/§20 — registration/sign-in must return the user to the app they
 * started from). An explicit allowlist, not a generic "starts with /"
 * check: `returnTo` is untrusted query-string input, and even though the
 * authentication behind this page is mocked, the redirect target it
 * produces is real, so it must never be trusted blindly. Only the
 * platform's own known app routes are ever valid; anything else — an
 * external URL, a protocol-relative `//host` path, an unrecognized
 * internal path — falls back to the given default.
 */
const ALLOWED_RETURN_TO_PATHS = new Set<string>(platformTools.map((tool) => tool.route));

export function resolveSafeReturnTo(returnTo: string | undefined, fallback: string): string {
  if (returnTo && ALLOWED_RETURN_TO_PATHS.has(returnTo)) {
    return returnTo;
  }
  return fallback;
}
