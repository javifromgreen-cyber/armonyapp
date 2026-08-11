"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Key } from "@/domain/keys";
import { listKeyOptions, keyOptionId, type KeyOption } from "./keyOptions";

export interface KeySelectorProps {
  value: Key | null;
  /** `null` means "Free mode" — the single control for both key choice and free mode (see item 6, docs/roadmap.md Phase 4.1 notes). */
  onChange: (key: Key | null) => void;
}

const FREE_MODE_VALUE = "__free__";

function keyOptionLabel(option: KeyOption, t: ReturnType<typeof useTranslations>): string {
  return `${option.tonicName} ${option.mode === "major" ? t("major") : t("minor")}`;
}

/**
 * The single tonal-context selector (product-spec.md §9): the 12 major keys
 * and their relative minors, generated from the key engine (see
 * ./keyOptions.ts) rather than hand-authored, each shown with its full mode
 * name ("C Major", never a bare "C") so it's unambiguous at a glance.
 * "Free mode" is one option in this same dropdown, not a separate control —
 * the harmonic graph is locked-key-only right now, so picking it shows an
 * explanatory empty state instead of faking harmonic inference (see
 * docs/roadmap.md Phase 4 notes).
 */
export function KeySelector({ value, onChange }: KeySelectorProps) {
  const t = useTranslations("app.key");
  const options = useMemo(() => listKeyOptions(), []);

  const selectedId = value ? keyOptionId(value) : FREE_MODE_VALUE;

  function handleChange(id: string) {
    if (id === FREE_MODE_VALUE) {
      onChange(null);
      return;
    }
    const option = options.find((o) => o.id === id);
    if (option) onChange(option.key);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
        {t("label")}
      </span>
      <select
        value={selectedId}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-accent"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {keyOptionLabel(option, t)}
          </option>
        ))}
        <option value={FREE_MODE_VALUE}>{t("freeModeOption")}</option>
      </select>
    </label>
  );
}
