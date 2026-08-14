import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSupabasePublicEnv } from "./env";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Legacy variable name — must have zero effect on this module (see the
  // publishable-key migration in this file's own docstring).
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

describe("getSupabasePublicEnv", () => {
  beforeEach(resetEnv);

  afterEach(() => {
    resetEnv();
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("succeeds with URL + PUBLISHABLE_KEY set, no ANON_KEY required", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";

    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("ignores a legacy NEXT_PUBLIC_SUPABASE_ANON_KEY — it is not a substitute", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon-key-should-be-ignored";

    expect(() => getSupabasePublicEnv()).toThrow(/PUBLISHABLE_KEY/);
  });

  it("throws a clear error naming PUBLISHABLE_KEY (never ANON_KEY) when the key is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    expect(() => getSupabasePublicEnv()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("throws when the URL is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_example";

    expect(() => getSupabasePublicEnv()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("throws when both are missing", () => {
    expect(() => getSupabasePublicEnv()).toThrow();
  });
});
