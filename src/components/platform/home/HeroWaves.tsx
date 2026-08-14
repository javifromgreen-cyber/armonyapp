const WAVE_PATH =
  "M0 100 C 100 40, 200 160, 300 100 S 500 40, 600 100 S 800 160, 800 100 V 200 H 0 Z";

/**
 * Abstract, non-literal wave backdrop for the hero (product-spec.md §8) —
 * "waves / resonance / movement", explicitly not stock music-note imagery.
 * Each `<path>` is drawn once and repeated at a +800 offset inside an
 * 1600-wide viewBox; animating the wrapper by exactly -50% (see
 * `.animate-hero-wave-*` in globals.css) loops it seamlessly.
 */
export function HeroWaves() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
    >
      <svg
        className="animate-hero-wave-slow absolute bottom-0 left-0 h-full w-[200%]"
        viewBox="0 0 1600 200"
        preserveAspectRatio="none"
      >
        <path d={WAVE_PATH} fill="var(--ona-accent)" opacity="0.18" />
        <path d={WAVE_PATH} transform="translate(800 0)" fill="var(--ona-accent)" opacity="0.18" />
      </svg>
      <svg
        className="animate-hero-wave-fast absolute bottom-0 left-0 h-2/3 w-[200%]"
        viewBox="0 0 1600 200"
        preserveAspectRatio="none"
      >
        <path d={WAVE_PATH} fill="var(--ona-surface)" opacity="0.9" />
        <path d={WAVE_PATH} transform="translate(800 0)" fill="var(--ona-surface)" opacity="0.9" />
      </svg>
    </div>
  );
}
