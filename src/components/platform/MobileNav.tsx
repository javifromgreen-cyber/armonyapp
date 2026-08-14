"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

export interface MobileNavItem {
  href: string;
  label: string;
}

/**
 * Mobile public/logged-in menu drawer (product-spec.md §16). A plain
 * disclosure panel, not a full-screen overlay library — keeps the touch
 * targets simple and avoids a new dependency for something this small.
 */
export function MobileNav({
  items,
  primaryAction,
  openLabel,
  closeLabel,
}: {
  items: MobileNavItem[];
  primaryAction: MobileNavItem;
  openLabel: string;
  closeLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label={isOpen ? closeLabel : openLabel}
        className="flex h-10 w-10 items-center justify-center rounded-sm text-ona-fg outline-none focus-visible:ring-2 focus-visible:ring-ona-accent"
      >
        <MenuIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full border-b border-ona-border bg-ona-bg px-6 py-4">
          <nav className="flex flex-col gap-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-base text-ona-fg-muted transition-colors hover:text-ona-fg"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={primaryAction.href}
              onClick={() => setIsOpen(false)}
              className="mt-2 rounded-full bg-ona-accent px-5 py-2.5 text-center text-sm font-medium text-ona-accent-foreground transition-opacity hover:opacity-90"
            >
              {primaryAction.label}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
