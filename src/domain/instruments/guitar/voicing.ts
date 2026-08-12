import type { Chord } from "../../chords/chord";
import { noteToPitchClass } from "../../notes";
import { chordToneTable, type ChordTone } from "./chordTones";
import { curatedFretsFor } from "./curatedShapes";
import { standardSearchWindows, generateCandidatesInWindow } from "./candidates";
import { evaluateCandidate, type EvaluatedVoicing } from "./playability";
import { scoreVoicing } from "./ranking";
import { diversityFilter } from "./diversity";
import type { GuitarStringSound, GuitarVoicing, VoicingCatalogue } from "./types";

/** Free ≈ 2 useful voicings (Phase 8 §10); the rest of the surfaced catalogue is Pro (Phase 8 §11). */
const MAX_FREE_VOICINGS = 2;
/** Enough to demonstrate the Free/Pro split without an exhaustive permutation catalogue (Phase 8 §11). */
const MAX_TOTAL_VOICINGS = 5;

/**
 * Chord-tone completeness (Phase 8 §12): root and 3rd are always required —
 * never silently dropped. The 5th may be omitted once a chord has a 7th (or
 * 6th) or 9th, since that's standard, well-documented guitar practice (the
 * 5th carries the least harmonic information); the 7th and 9th themselves
 * stay required whenever the chord has one, since those ARE what makes the
 * chord's quality legible.
 */
function requiredToneIndexes(toneCount: number): number[] {
  if (toneCount === 3) return [0, 1, 2]; // root, 3rd, 5th
  if (toneCount === 4) return [0, 1, 3]; // root, 3rd, 7th/6th — 5th optional
  return [0, 1, 3, 4]; // 5-tone (9th-family): root, 3rd, 7th, 9th — 5th optional
}

function soundingPitchClasses(strings: GuitarStringSound[]): Set<number> {
  const pitchClasses = new Set<number>();
  for (const s of strings) {
    if (s.pitch) pitchClasses.add(noteToPitchClass(s.pitch.note));
  }
  return pitchClasses;
}

function meetsCompleteness(tones: ChordTone[], evaluated: EvaluatedVoicing): boolean {
  const sounding = soundingPitchClasses(evaluated.strings);
  return requiredToneIndexes(tones.length).every((index) => sounding.has(tones[index].pitchClass));
}

function shapeSignature(strings: GuitarStringSound[]): string {
  return strings
    .map((s) => (s.state.status === "muted" ? "x" : s.state.status === "open" ? "0" : String(s.state.fret)))
    .join(",");
}

function inversionOf(tones: ChordTone[], strings: GuitarStringSound[]): number {
  const sounding = strings.filter((s) => s.pitch);
  if (sounding.length === 0) return 0;
  const bass = sounding.reduce((lowest, s) => (s.pitch!.midi < lowest.pitch!.midi ? s : lowest));
  const bassPitchClass = noteToPitchClass(bass.pitch!.note);
  const index = tones.findIndex((t) => t.pitchClass === bassPitchClass);
  return index === -1 ? 0 : index;
}

interface CandidateEntry {
  evaluated: EvaluatedVoicing;
  origin: "curated" | "generated";
  inversion: number;
}

/**
 * Every playable guitar voicing offered for `chord` (Phase 8 §4/§10/§11):
 * a small hand-verified curated shape when one exists (Phase 8 §25, Phase
 * 8.1 §5), plus algorithmically generated shapes from the open/E-shape/
 * A-shape search windows — filtered for physical playability
 * (`playability.ts`) and chord-tone completeness, deduplicated by exact
 * fret pattern, ranked (`ranking.ts`, with a modest root-position
 * tie-breaker per Phase 8.1 §2), passed through a near-duplicate diversity
 * filter (Phase 8.1 §6/§7 — `diversity.ts`), and split
 * root+1st-inversion-style into Free (first `MAX_FREE_VOICINGS`) vs Pro
 * (the rest). Returns an empty array — never a fabricated shape — when
 * nothing playable is found (Phase 8 §24).
 */
export function guitarVoicingsFor(chord: Chord): GuitarVoicing[] {
  const tones = chordToneTable(chord);
  const rootPitchClass = tones[0].pitchClass;
  const seenSignatures = new Set<string>();
  const entries: CandidateEntry[] = [];

  const curatedFrets = curatedFretsFor(chord);
  if (curatedFrets) {
    const evaluated = evaluateCandidate(chord, {
      windowId: "curated",
      frets: curatedFrets.map((f) => (f === "x" ? "mute" : f)),
    });
    if (evaluated && meetsCompleteness(tones, evaluated)) {
      entries.push({ evaluated, origin: "curated", inversion: inversionOf(tones, evaluated.strings) });
      seenSignatures.add(shapeSignature(evaluated.strings));
    }
  }

  const generated: CandidateEntry[] = [];
  for (const window of standardSearchWindows(chord)) {
    for (const raw of generateCandidatesInWindow(chord, window)) {
      const evaluated = evaluateCandidate(chord, raw);
      if (!evaluated || !meetsCompleteness(tones, evaluated)) continue;
      const signature = shapeSignature(evaluated.strings);
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);
      generated.push({ evaluated, origin: "generated", inversion: inversionOf(tones, evaluated.strings) });
    }
  }

  const scoredGenerated = generated
    .map((entry) => {
      const rootPresent = soundingPitchClasses(entry.evaluated.strings).has(rootPitchClass);
      const distinctTones = soundingPitchClasses(entry.evaluated.strings).size;
      const isRootPosition = entry.inversion === 0;
      return { entry, score: scoreVoicing(entry.evaluated, rootPresent, distinctTones, isRootPosition) };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);

  const diverseGenerated = diversityFilter(
    scoredGenerated,
    (e) => e.evaluated,
    (e) => e.inversion,
    entries, // curated shapes already kept — suppress generated near-duplicates of them too
  );

  entries.push(...diverseGenerated);

  return entries.slice(0, MAX_TOTAL_VOICINGS).map((entry, index) => {
    const rootPresent = soundingPitchClasses(entry.evaluated.strings).has(rootPitchClass);
    const catalogue: VoicingCatalogue = index < MAX_FREE_VOICINGS ? "free" : "pro";
    return {
      id: `${entry.origin}-${index}`,
      chord,
      strings: entry.evaluated.strings,
      fretSpan: entry.evaluated.fretSpan,
      baseFret: entry.evaluated.baseFret,
      barre: entry.evaluated.barre,
      inversion: entry.inversion,
      rootPresent,
      origin: entry.origin,
      catalogue,
    };
  });
}
