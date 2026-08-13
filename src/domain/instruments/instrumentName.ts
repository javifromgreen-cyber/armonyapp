/**
 * The set of real, sample-backed instruments the product supports (Phase 7
 * Piano, Phase 8 Guitar, Phase 9 Bass — all three actually implemented,
 * never a placeholder). Single source of truth shared by the domain
 * instrument catalogues (`piano/guitar/bass` sub-modules, keyed implicitly
 * by these same three names), the audio layer (`src/audio/player.ts`'s
 * sampler selection), and the UI's global instrument selector (Phase R3.3
 * §6) — one canonical union type rather than three separately declared
 * `"piano" | "guitar" | "bass"` string literals that could drift apart.
 */
export type InstrumentName = "piano" | "guitar" | "bass";

export const INSTRUMENT_NAMES: readonly InstrumentName[] = ["piano", "guitar", "bass"];
