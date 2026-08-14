/**
 * Centralized platform app catalogue (R4, product-spec.md §0/§2/§10-11).
 * Localized copy lives in the `platform.tools.<id>` i18n namespace, looked
 * up by `id` — never hardcoded here or in the rendering component. Only
 * Armony exists today; new apps join by appending an entry, never by
 * hardcoding another card in the catalogue component.
 */
export interface PlatformTool {
  id: string;
  /** Locale-relative route (passed through the i18n-aware `Link`). */
  route: string;
}

export const platformTools: PlatformTool[] = [{ id: "armony", route: "/app" }];
