import { describe, expect, it } from "vitest";
import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";

/**
 * Regression guard for the "Manage subscription" UX fix (ONA Functional
 * Phase 2 closing patch): `AccountStateCard.tsx`'s `ProCard` used to render
 * a button labeled "Manage subscription" whose destination was simply
 * `https://link.com` — misleading, since Stripe's Managed Payments API
 * (confirmed against the `stripe` package's own bundled types — see that
 * component's docstring) exposes no transaction-specific management URL to
 * retrieve. `AccountStateCard.tsx` itself can't be rendered in Vitest (it's
 * an async Server Component; `next-intl/server`'s `getTranslations` throws
 * "not supported in Client Components" outside a real Next.js request —
 * confirmed empirically while writing this fix), so this asserts on the
 * actual message content the component reads instead: the misleading
 * button-style copy must be gone, and the new explanatory copy must exist.
 */
describe("account 'manage subscription' copy (regression guard)", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["es", es],
  ] as const) {
    const account = messages.platform.account as Record<string, unknown>;

    it(`${locale}: no longer exposes a "manage" label on monthly/annual as if it were a direct subscription-management button`, () => {
      const monthly = account.monthly as Record<string, unknown>;
      const annual = account.annual as Record<string, unknown>;
      expect(monthly).not.toHaveProperty("manage");
      expect(annual).not.toHaveProperty("manage");
      expect(account).not.toHaveProperty("manageNote");
    });

    it(`${locale}: has replacement explanatory copy that never claims link.com opens the subscription directly`, () => {
      expect(account).toHaveProperty("manage");
      const manage = account.manage as { title: string; body: string; openLink: string };
      expect(typeof manage.title).toBe("string");
      expect(manage.title.length).toBeGreaterThan(0);
      expect(typeof manage.body).toBe("string");
      // The explanatory body must point at email as the real channel for a
      // transaction-specific link — never claim the generic destination
      // itself opens the subscription.
      expect(manage.body.toLowerCase()).toMatch(/email|correo/);
      expect(typeof manage.openLink).toBe("string");
      // The "go to link.com" label must not itself claim to manage/gestionar
      // the subscription — it's explicitly a generic destination.
      expect(manage.openLink.toLowerCase()).not.toMatch(/manage|gestion/);
    });
  }
});
