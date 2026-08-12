/**
 * The active instrument representation shown in the chord panel (Phase 8
 * §22, extended Phase 9 §28). V1 has Piano (Phase 7), Guitar (Phase 8), and
 * Bass (Phase 9) — all three real, implemented instruments. Never a
 * fake/placeholder instrument: only list one once its phase is actually
 * built.
 */
export type Instrument = "piano" | "guitar" | "bass";

export const AVAILABLE_INSTRUMENTS: readonly Instrument[] = ["piano", "guitar", "bass"];
