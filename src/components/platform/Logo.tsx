import Image from "next/image";
import { Link } from "@/i18n/navigation";

/**
 * ONA's approved brand mark. Two derived assets, both processed once from
 * the single supplied source logo (`public/brand/` — never retraced or
 * redrawn): the full lettering+waveform lockup, and a compact waveform-only
 * mark for spots too small for the full lockup to read cleanly. Swapping
 * either asset later (a final vector file, a refined crop) only means
 * replacing the PNG at the same path — every call site renders through
 * this one component.
 */
const LOGO_ASSETS = {
  full: { src: "/brand/ona-logo-full.png", width: 1000, height: 1094 },
  compact: { src: "/brand/ona-mark-compact.png", width: 800, height: 174 },
} as const;

type LogoVariant = keyof typeof LOGO_ASSETS;

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  /** Rendered height in pixels; width is derived to preserve the source asset's proportions. */
  heightPx?: number;
  alt?: string;
}

export function Logo({ className = "", variant = "full", heightPx = 40, alt = "ONA" }: LogoProps) {
  const asset = LOGO_ASSETS[variant];
  const width = Math.round((heightPx * asset.width) / asset.height);

  return (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={heightPx}
      priority
      className={`select-none ${className}`}
    />
  );
}

export function LogoLink({
  className = "",
  variant = "full",
  heightPx = 40,
}: Omit<LogoProps, "alt">) {
  return (
    <Link
      href="/"
      className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ona-accent"
      aria-label="ONA"
    >
      {/* alt="" — the link above already carries the accessible name. */}
      <Logo className={className} variant={variant} heightPx={heightPx} alt="" />
    </Link>
  );
}
