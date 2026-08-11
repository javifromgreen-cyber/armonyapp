import { chordNotes, type Chord } from "../../chords/chord";
import { stackAscending, playablePitchOneOctaveUp } from "../playablePitch";
import type { Fingering, PianoVoicing, VoicingCatalogue } from "./types";

/** Same central register `src/audio/voicing.ts`'s neutral preview uses — comfortable, never muddy-low or thin-high, and (per Phase 7 §10) this holds regardless of the chord's root letter because `stackAscending` places every subsequent tone by the smallest ascending step, not by a fixed per-letter table (verified for e.g. Bmaj7/Dbmaj7 in tests). */
const BASE_OCTAVE = 4;

function rotate<T>(items: readonly T[], by: number): T[] {
  return [...items.slice(by), ...items.slice(0, by)];
}

/**
 * Suggested RIGHT-HAND fingering (Phase 7 §11) for a CLOSE-position voicing.
 * Only two shapes are reliable enough to suggest without knowing the exact
 * intervals present:
 *   - 3-tone (triad-family) close voicings: 1-3-5 (thumb-middle-pinky), the
 *     standard default regardless of inversion.
 *   - 4-tone (7th/6th-family) close voicings: 1-2-3-5, the common
 *     close-position suggestion that skips the 4th finger.
 * Anything else (5-note extended chords, "open" spacing) genuinely depends
 * on the specific stretch involved — per the brief's explicit instruction
 * to omit rather than guess, this returns `undefined` for those.
 */
function suggestedFingering(toneCount: number, spacing: "close" | "open"): Fingering | undefined {
  if (spacing !== "close") return undefined;
  if (toneCount === 3) return { hand: "right", fingers: [1, 3, 5] };
  if (toneCount === 4) return { hand: "right", fingers: [1, 2, 3, 5] };
  return undefined;
}

/**
 * Root position and 1st inversion are always Free (product-spec Free plan
 * §19's "basic instrument representations"); a triad's small 3-voicing
 * catalogue is small enough that gating its 2nd inversion behind Pro would
 * be unhelpfully stingy, so triads get all 3. Everything else (2nd/3rd
 * inversion of a 4-tone chord, the "open" voicing of a 5-tone chord) is Pro
 * — see Phase 7 §7/§8.
 */
function catalogueFor(toneCount: number, rotation: number): VoicingCatalogue {
  if (rotation <= 1) return "free";
  if (toneCount === 3 && rotation === 2) return "free";
  return "pro";
}

/**
 * Every piano voicing offered for `chord` (Phase 7 §7-9). V1 strategy,
 * documented here and in docs/music-engine.md:
 *
 * - **3-tone chords** (major/minor/diminished/augmented/sus2/sus4): root,
 *   1st, and 2nd inversion — all 3 rotations, all Free.
 * - **4-tone chords** (7th/6th-family): root, 1st, 2nd, and 3rd inversion —
 *   all 4 rotations; root+1st Free, 2nd+3rd Pro.
 * - **5-tone chords** (9th-family): only root and 1st inversion are
 *   generated as rotations (both Free) — a "2nd inversion" of a 9th chord
 *   is rarely musically discussed and close-position 3rd/4th rotations of
 *   a 5-note chord get genuinely awkward, so instead of mechanically
 *   rotating further, a single Pro "open" voicing is added: the root
 *   position's pitch set with its top tone raised an octave (an explicit,
 *   deterministic octave-displacement rule — Phase 7 §8's "octave
 *   displacement", never a random permutation).
 *
 * Inversion identity is derived strictly from which formula tone became
 * the bass (rotation N puts `chordNotes(chord)[N]` in the bass — Phase 7
 * §9), never hand-labeled per chord type. Register uses `stackAscending`'s
 * closest-ascending-step placement (Phase 7 §10), which stays centrally
 * placed regardless of the chord's root letter.
 */
export function pianoVoicingsFor(chord: Chord): PianoVoicing[] {
  const formulaNotes = chordNotes(chord);
  const toneCount = formulaNotes.length;
  const rotationCount = toneCount >= 5 ? 2 : toneCount;
  const voicings: PianoVoicing[] = [];

  for (let rotation = 0; rotation < rotationCount; rotation++) {
    const pitches = stackAscending(rotate(formulaNotes, rotation), BASE_OCTAVE);
    voicings.push({
      id: rotation === 0 ? "root" : `inversion${rotation}`,
      chord,
      pitches,
      inversion: rotation,
      spacing: "close",
      catalogue: catalogueFor(toneCount, rotation),
      fingering: suggestedFingering(toneCount, "close"),
    });
  }

  if (toneCount >= 5) {
    const rootPitches = voicings[0].pitches;
    const topPitch = rootPitches[rootPitches.length - 1];
    voicings.push({
      id: "open",
      chord,
      pitches: [...rootPitches.slice(0, -1), playablePitchOneOctaveUp(topPitch)],
      inversion: 0,
      spacing: "open",
      catalogue: "pro",
      fingering: undefined,
    });
  }

  return voicings;
}
