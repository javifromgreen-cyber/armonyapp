/**
 * ONA's recurring wave motif (product-spec.md §1/§8) — hand-authored organic
 * Bézier curves, deliberately irregular (varying crest height/spacing)
 * rather than a repeating sine pattern, so it reads as an editorial line
 * drawing rather than a generic "wave icon" tiled across the page. Every
 * curve is defined ONCE as an open crest line; a filled silhouette is
 * derived from it by closing the path down to the canvas bottom — so the
 * stroke (crisp, recognizable outline) and the fill (soft body) always
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

/** The hero's main wave — two irregular crests and troughs, most of the recognizable "wave" cue lives here. */
export const HERO_PRIMARY: WaveCurve = {
  width: 1440,
  height: 500,
  crest:
    "M0,296 C 130,232 240,352 372,308 C 486,270 528,182 676,208 C 812,232 846,344 992,318 C 1128,294 1204,204 1440,244",
};

/** A fainter, lower, differently-shaped wave behind the primary one, for parallax depth. */
export const HERO_SECONDARY: WaveCurve = {
  width: 1440,
  height: 500,
  crest:
    "M0,372 C 168,330 256,406 428,384 C 588,364 660,306 812,332 C 954,356 1012,414 1176,398 C 1332,382 1384,344 1440,360",
};

/**
 * A single large, calmer crest meant to be cropped by its section (only part
 * of the curve on-screen, per product-spec.md §3's "large cropped wave
 * fragments entering from an edge") — one gentle rise, not multiple
 * undulations, so it stays calm rather than becoming another focal point.
 */
export const EDGE_FRAGMENT: WaveCurve = {
  width: 1440,
  height: 640,
  crest: "M0,420 C 360,320 620,300 900,380 C 1120,444 1280,392 1440,320",
};

export function crestPath(curve: WaveCurve): string {
  return curve.crest;
}

export function fillPath(curve: WaveCurve): string {
  return filledPath(curve);
}
