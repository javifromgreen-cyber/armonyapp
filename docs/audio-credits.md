# Audio credits

Instrument playback for "Hear this voicing" (Piano, Guitar) and "Hear this pattern" (Bass) — Phase
R2 — uses a small set of real recorded samples instead of pure synthesis, so each instrument has a
genuine, distinguishable identity. "Hear chord" and progression playback stay on a neutral
synthesized voice (product-spec.md §18) and use none of the samples below.

## Source

- **Soundfont**: [FluidR3_GM](http://www.synthfont.com/SoundFonts/FluidR3_GM.sfArk), a General MIDI
  soundfont.
- **Rendered to per-note MP3 files by**: [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts)
  (a widely-used, long-standing open source project providing pre-rendered General MIDI instrument
  samples for web playback).
- **License**: [Creative Commons Attribution 3.0 United States (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/us/).
  This license permits commercial use and modification, provided attribution is given — this file
  is that attribution.

## What was used

Three General MIDI instrument sample sets, each reduced to a small, sparse multisample (not the
full 88-key range) to keep asset size small — `Tone.Sampler` repitches the gaps between recorded
notes, which is standard practice and keeps quality high while asset size stays small:

| Armony instrument | GM instrument used | Notes sampled | Files | Approx. size |
|---|---|---|---|---|
| Piano | `acoustic_grand_piano` | C4, E4, Ab4, C5, E5, Ab5, C6, E6, Ab6, C7 | 10 | ~215 KB |
| Guitar | `acoustic_guitar_steel` | E2, Ab2, C3, E3, Ab3, C4, E4, Ab4, C5, E5 | 10 | ~183 KB |
| Bass | `electric_bass_finger` | E1, Ab1, C2, E2, Ab2, C3, E3, Ab3 | 8 | ~127 KB |

`electric_bass_finger` specifically was chosen (over a fretless, synth-bass, or slap GM patch) to
match product-spec.md §15/§19's requirement for a genuine fingerstyle electric bass identity —
warm fundamental, natural sustain, no glide/portamento.

Files are re-hosted as static assets under this app's own `public/audio/{piano,guitar,bass}/`
directory and served from this app's own domain — never hotlinked from the source repository at
runtime (GitHub's raw-content hosting is not intended for production hotlinking; these files were
downloaded once during development and committed to this repository).

## Changes made (as CC BY 3.0 requires disclosing)

- Selected a sparse subset of notes per instrument (not the full chromatic range the source
  provides) to minimize asset size.
- Re-hosted the selected files as static assets in this repository rather than referencing the
  source repository's hosting at runtime.
- No pitch, timing, or audio content of the samples themselves was altered.

## Where this is wired up

`src/audio/player.ts`'s `SAMPLE_MAPS` and `getInstrumentVoice()` — each instrument's `Tone.Sampler`
lazy-loads its own sample set only the first time that instrument's "Hear this voicing/pattern" is
used, and stays cached for the rest of the session.
