import type { ReactNode } from "react";
import { LogoLink } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Minimal top bar (brand + language only, no marketing nav) for focused,
 * single-purpose screens — sign-in and trial-ended (product-spec.md §17/§19).
 * The full `PlatformHeader` would be noise here.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="ona-shell flex min-h-full flex-col bg-ona-bg text-ona-fg">
      <div className="flex items-center justify-between px-6 py-4">
        <LogoLink />
        <LocaleSwitcher />
      </div>
      <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}
