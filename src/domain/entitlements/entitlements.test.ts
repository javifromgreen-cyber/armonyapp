import { describe, expect, it } from "vitest";
import { entitlementsFor } from "./entitlements";

describe("entitlementsFor", () => {
  it("grants full capabilities while trialing", () => {
    expect(entitlementsFor("trialing")).toEqual({
      status: "trialing",
      canUseApp: true,
      canSaveProjects: true,
      canExport: true,
    });
  });

  it("grants full capabilities while active", () => {
    expect(entitlementsFor("active")).toEqual({
      status: "active",
      canUseApp: true,
      canSaveProjects: true,
      canExport: true,
    });
  });

  it("denies every capability once expired", () => {
    expect(entitlementsFor("expired")).toEqual({
      status: "expired",
      canUseApp: false,
      canSaveProjects: false,
      canExport: false,
    });
  });
});
