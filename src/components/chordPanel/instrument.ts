/**
 * The active instrument representation shown in the chord panel (Phase 8
 * §22). V1 has Piano (Phase 7) and Guitar (Phase 8); Bass (Phase 9) will
 * extend this list, not replace it — adding it later is only a matter of
 * appending here and rendering its panel, no rework of this type or the
 * selector. Never a fake/placeholder instrument: only list one once its
 * phase is actually built.
 */
export type Instrument = "piano" | "guitar";

export const AVAILABLE_INSTRUMENTS: readonly Instrument[] = ["piano", "guitar"];
