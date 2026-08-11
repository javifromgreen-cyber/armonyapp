import type { Chord } from "@/domain/chords";
import type { Key } from "@/domain/keys";
import { diatonicChords, type TriadQuality } from "@/domain/keys";
import { contextualRole, diatonicDegreeOf, type ContextualRoleKind } from "@/domain/harmony";

/**
 * Presentation-only refinement of `contextualRole` (product-spec.md §11): a
 * scale-degree roman numeral, plus a distinction between the true tonic
 * (I) and the rest of the tonic-function family (iii, vi) that
 * `contextualRole` deliberately does not make — it only tracks a coarse
 * `HarmonicFunction`. Nothing here changes the harmonic engine; it only
 * relabels the same `contextualRole` result for display.
 *
 * The roman numeral is shown ONLY for the plain diatonic family
 * (tonic/predominant/dominant) — never for a role that's already been
 * overridden to something more specific (secondary dominant, functional
 * dominant, borrowed). This matters because a chord can share its ROOT with
 * a diatonic degree without functioning as that degree (e.g. C7 in C major
 * has the same root as the tonic but is V7/IV, not "I" — see
 * `contextualRole.ts`'s own doc comment on this exact hazard). Gating on
 * `role.kind` rather than on `diatonicDegreeOf` directly is what avoids
 * reintroducing that bug here.
 */
export interface FunctionDisplayInfo {
  /** e.g. "I", "vi", "vii°" — undefined when a numeral would be misleading or inapplicable. */
  romanNumeral: string | undefined;
  /** i18n key under `harmony.function.*` — `tonicFunction` is new, distinguishing iii/vi from the true tonic (I). */
  labelKey: ContextualRoleKind | "tonicFunction";
}

const NUMERAL_BY_DEGREE = ["I", "II", "III", "IV", "V", "VI", "VII"];

function romanNumeral(degree: number, quality: TriadQuality): string {
  const base = NUMERAL_BY_DEGREE[degree - 1];
  switch (quality) {
    case "major":
      return base;
    case "minor":
      return base.toLowerCase();
    case "diminished":
      return `${base.toLowerCase()}°`;
    case "augmented":
      return `${base}+`;
  }
}

export function functionDisplayInfo(chord: Chord, context: Key): FunctionDisplayInfo | undefined {
  const role = contextualRole(chord, context);
  if (!role) return undefined;

  if (role.kind !== "tonic" && role.kind !== "predominant" && role.kind !== "dominant") {
    return { romanNumeral: undefined, labelKey: role.kind };
  }

  const degree = diatonicDegreeOf(chord, context);
  if (degree === undefined) {
    return { romanNumeral: undefined, labelKey: role.kind };
  }

  const diatonic = diatonicChords(context)[degree - 1];
  const labelKey = role.kind === "tonic" && degree !== 1 ? "tonicFunction" : role.kind;

  return { romanNumeral: romanNumeral(degree, diatonic.quality), labelKey };
}
