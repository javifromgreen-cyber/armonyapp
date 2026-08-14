/**
 * ONA's recurring wave motif (product-spec.md §1/§8) — hand-authored organic
 * Bézier curves, each with 2-3 asymmetric crests and troughs so it reads
 * unmistakably as a WAVE (a repeated rise-and-fall) rather than a single
 * hill/blob. Deliberately irregular — no two crests in a curve share
 * identical control-point spacing — so it reads as an editorial line
 * drawing, not a tiled "wave icon" or an equalizer's uniform bars. Every
 * curve is defined ONCE as an open crest line; a filled silhouette is
 * derived from it by closing the path down to the canvas bottom — so a
 * stroke (crisp, recognizable outline) and a fill of the same wave always
 * trace the exact same line.
 */

export interface WaveCurve {
  /** ViewBox is always `0 0 ${width} ${height}`. */
  width: number;
  height: number;
  /** The open crest line, left edge to right edge — usable directly as a `<path>` `d` for a stroke. */
  crest: string;
}

function filledPath(curve: WaveCurve): string {
  return `${curve.crest} L${curve.width},${curve.height} L0,${curve.height} Z`;
}

/**
 * The hero's main wave — three gentle, unevenly-spaced asymmetric swells.
 * Most of the recognizable "this is a wave, not a hill" cue lives in this
 * curve's rhythm: it rises and falls more than once, at irregular
 * intervals, the way a real swell or a sound wave does.
 */
export const HERO_PRIMARY: WaveCurve = {
  width: 1440,
  height: 560,
  crest:
    "M0,460 C 100,435 165,375 280,365 C 370,357 400,410 480,420 C 580,432 630,385 720,372 C 810,359 850,405 940,422 C 1040,440 1100,470 1200,472 C 1300,474 1360,435 1440,418",
};

/** A fainter, differently-shaped wave behind the primary one, for parallax depth. */
export const HERO_SECONDARY: WaveCurve = {
  width: 1440,
  height: 560,
  crest:
    "M0,420 C 90,390 150,330 260,320 C 350,312 380,370 460,380 C 560,392 610,340 700,325 C 790,310 830,360 920,378 C 1020,398 1080,430 1180,432 C 1280,434 1340,390 1440,370",
};

/**
 * Introduction section — two crests, meant to be cropped/bled from one edge
 * by `SectionWave` at low opacity/intensity relative to the hero.
 */
export const INTRO_WAVE: WaveCurve = {
  width: 1440,
  height: 640,
  crest:
    "M0,380 C 140,360 200,260 340,240 C 460,224 500,300 600,320 C 720,344 800,340 900,300 C 1000,260 1080,180 1200,190 C 1300,198 1380,240 1440,260",
};

/**
 * 72-hour trial section — a tighter, differently-scaled rhythm than
 * `INTRO_WAVE` (deliberately not a reuse of the same curve mirrored), so the
 * two low-intensity section waves don't read as copies of each other.
 */
export const TRIAL_WAVE: WaveCurve = {
  width: 1440,
  height: 500,
  crest:
    "M0,300 C 100,280 140,190 260,180 C 360,172 400,240 500,260 C 620,284 700,270 800,220 C 900,170 980,140 1100,160 C 1200,176 1320,220 1440,210",
};

export function crestPath(curve: WaveCurve): string {
  return curve.crest;
}

export function fillPath(curve: WaveCurve): string {
  return filledPath(curve);
}
