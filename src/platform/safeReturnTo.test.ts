import { describe, expect, it } from "vitest";
import { resolveSafeReturnTo } from "./safeReturnTo";

describe("resolveSafeReturnTo", () => {
  it("accepts a known platform app route", () => {
    expect(resolveSafeReturnTo("/app", "/account")).toBe("/app");
  });

  it("falls back for undefined input", () => {
    expect(resolveSafeReturnTo(undefined, "/account")).toBe("/account");
  });

  it("falls back for an unrecognized internal path", () => {
    expect(resolveSafeReturnTo("/not-a-real-route", "/account")).toBe("/account");
  });

  it("falls back for an absolute external URL", () => {
    expect(resolveSafeReturnTo("https://evil.example.com", "/account")).toBe("/account");
  });

  it("falls back for a protocol-relative URL", () => {
    expect(resolveSafeReturnTo("//evil.example.com", "/account")).toBe("/account");
  });

  it("falls back for an empty string", () => {
    expect(resolveSafeReturnTo("", "/account")).toBe("/account");
  });
});
