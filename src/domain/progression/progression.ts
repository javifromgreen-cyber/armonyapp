/**
 * The fixed tempo reference used for Bass "Hear this pattern" step timing
 * (Phase R3.4 — the progression-level BPM control that used to feed this
 * was removed, since Armony is a harmonic-exploration tool, not a
 * sequencer; see `docs/product-spec.md` §16's R3.4 revision). A plain
 * constant rather than a user-adjustable value — deterministic, no tempo
 * intelligence, matching the same value the removed control used to
 * default to, so this is a UI-simplification, not an audible behavior
 * change for anyone who never touched the old BPM field.
 */
export const DEFAULT_BPM = 90;
