"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

/**
 * Global "ES | EN" control (product-spec.md §4). Swaps the locale segment
 * for the current route while staying on the same page — next-intl's
 * locale-aware router keeps query string and hash intact, so a mid-page
 * anchor (e.g. `/#pricing`) or `?from=` param survives the switch.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={`flex items-center gap-1 text-sm text-ona-fg-muted ${className}`}>
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && <span aria-hidden="true">|</span>}
          <LocaleOption
            locale={locale}
            isActive={locale === activeLocale}
            onSelect={() => router.replace(pathname, { locale })}
          />
        </span>
      ))}
    </div>
  );
}

function LocaleOption({
  locale,
  isActive,
  onSelect,
}: {
  locale: Locale;
  isActive: boolean;
  onSelect: () => void;
}) {
  if (isActive) {
    return (
      <span aria-current="true" className="font-medium text-ona-fg">
        {locale.toUpperCase()}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-sm outline-none transition-colors hover:text-ona-fg focus-visible:ring-2 focus-visible:ring-ona-accent"
    >
      {locale.toUpperCase()}
    </button>
  );
}
