/**
 * Visual-only mock account state (R4, product-spec.md §0/§2/§18-19). No real
 * auth/entitlement backend exists yet — this is the single place that
 * invents placeholder account data, so it's trivial to delete once a real
 * platform-wide entitlement system replaces it.
 */
export type MockAccessStatus = "trialing" | "monthly" | "annual" | "cancelled";

export interface MockAccount {
  email: string;
  status: MockAccessStatus;
  /** ISO date relevant to the status: trial end / next charge / access-until. */
  date: string;
}

const MOCK_EMAIL = "you@example.com";

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const MOCK_STATUS_OFFSET_DAYS: Record<MockAccessStatus, number> = {
  trialing: 2,
  monthly: 21,
  annual: 210,
  cancelled: 9,
};

export function isMockAccessStatus(value: string): value is MockAccessStatus {
  return value in MOCK_STATUS_OFFSET_DAYS;
}

export function getMockAccount(status: MockAccessStatus = "trialing"): MockAccount {
  return { email: MOCK_EMAIL, status, date: daysFromNow(MOCK_STATUS_OFFSET_DAYS[status]) };
}
