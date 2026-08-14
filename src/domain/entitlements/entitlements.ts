import type { EntitlementStatus, Entitlements } from "./types";

const CAPABILITIES_BY_STATUS: Record<EntitlementStatus, Omit<Entitlements, "status">> = {
  trialing: { canUseApp: true, canSaveProjects: true, canExport: true },
  active: { canUseApp: true, canSaveProjects: true, canExport: true },
  expired: { canUseApp: false, canSaveProjects: false, canExport: false },
  past_due: { canUseApp: false, canSaveProjects: false, canExport: false },
  canceled: { canUseApp: false, canSaveProjects: false, canExport: false },
};

/** The single place `EntitlementStatus` -> capabilities is decided — never `status === "..."` checks scattered elsewhere. */
export function entitlementsFor(status: EntitlementStatus): Entitlements {
  return { status, ...CAPABILITIES_BY_STATUS[status] };
}
