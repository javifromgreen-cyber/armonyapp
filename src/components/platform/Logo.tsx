import { Link } from "@/i18n/navigation";

/**
 * ONA's brand mark (product-spec.md §1). No approved raster/vector asset
 * was supplied to this build, so per the spec's own fallback instructions
 * this renders a clean typographic wordmark instead of tracing/recreating a
 * logo automatically. Swap this file's contents for a real `<Image>` once a
 * transparent/vector asset is approved — every call site already renders it
 * through this one component, so nothing else needs to change.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`select-none text-lg font-semibold tracking-[0.14em] text-ona-fg ${className}`}
    >
      ONA
    </span>
  );
}

export function LogoLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ona-accent"
      aria-label="ONA"
    >
      <Logo className={className} />
    </Link>
  );
}
