import type { ZoomLevel } from "../harmony/types";

/**
 * The i18n message key (under `app.navigation.depth.*`) for each harmonic
 * depth, matching product-spec.md §8's four depth names exactly — Phase R3
 * §5 keeps this same four-level model, just descriptive now rather than a
 * manual pre-exploration knob (§4/§34).
 */
export const DEPTH_LABEL_KEY: Record<ZoomLevel, string> = {
  1: "direct",
  2: "expanded",
  3: "colour",
  4: "deep",
};
