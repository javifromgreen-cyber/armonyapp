"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Key } from "@/domain/keys";
import { listKeyOptions, keyOptionId } from "./keyOptions";

export interface KeySelectorProps {
  value: Key | null;
  onChange: (key: Key) => void;
}

const FREE_MODE_VALUE = "__free__";

/**
 * A basic tonal-context selector for Phase 4 (product-spec.md §9): the 12
 * major keys and their relative minors, generated from the key engine (see
 * ./keyOptions.ts) rather than hand-authored. "Free mode" is offered as a
 * distinct, honestly-labeled option — the harmonic graph is locked-key-only
 * right now, so picking it shows an explanatory empty state instead of
 * faking harmonic inference (see docs/roadmap.md Phase 4 notes).
 */
export function KeySelector({ value, onChange }: KeySelectorProps) {
  const t = useTranslations("app.key");
  const options = useMemo(() => listKeyOptions(), []);

  const selectedId = value ? keyOptionId(value) : FREE_MODE_VALUE;

  function handleChange(id: string) {
    if (id === FREE_MODE_VALUE) return;
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
            {option.label}
          </option>
        ))}
        <option value={FREE_MODE_VALUE}>{t("freeModeOption")}</option>
      </select>
    </label>
  );
}
