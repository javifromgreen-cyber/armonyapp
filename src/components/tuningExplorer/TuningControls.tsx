"use client";

import { useTranslations } from "next-intl";
import type { Notation } from "@/domain/notes";
import type { StringCount, TuningExplorerInstrument, TuningFamily, TuningPreset } from "@/domain/tuningExplorer";
import { familiesFor, presetsFor } from "@/domain/tuningExplorer";
import { Pill, PillGroup } from "./InstrumentControls";

/** Compact family tabs/pills (product spec §6) — only families that actually contain a preset for this instrument/string-count are shown, plus "Custom" always. */
export function TuningFamilyTabs({
  instrument,
  stringCount,
  value,
  onChange,
}: {
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  value: TuningFamily;
  onChange: (family: TuningFamily) => void;
}) {
  const t = useTranslations("tuningExplorer.family");
  const families = familiesFor(instrument, stringCount);
  return (
    <PillGroup label={t("groupLabel")}>
      {families.map((family) => (
        <Pill key={family} isActive={family === value} onClick={() => onChange(family)}>
          {t(family)}
        </Pill>
      ))}
    </PillGroup>
  );
}

/** The specific tuning within a family — a dropdown, not pills (product spec §6: "The specific tuning is selected from a dropdown"). Hidden entirely while Custom is active — `CustomTuningEditor` takes its place. */
export function TuningSelect({
  instrument,
  stringCount,
  family,
  presetId,
  onChange,
}: {
  instrument: TuningExplorerInstrument;
  stringCount: StringCount;
  family: TuningFamily;
  presetId: string | null;
  onChange: (presetId: string) => void;
}) {
  const t = useTranslations("tuningExplorer");
  if (family === "custom") return null;

  const options: TuningPreset[] = presetsFor(instrument, stringCount).filter((p) => p.family === family);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-foreground-muted uppercase">{t("tuningLabel")}</span>
      <select
        value={presetId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NotationToggle({ value, onChange }: { value: Notation; onChange: (notation: Notation) => void }) {
  const t = useTranslations("tuningExplorer.notation");
  return (
    <PillGroup label={t("groupLabel")}>
      <Pill isActive={value === "sharp"} onClick={() => onChange("sharp")}>
        {t("sharpSymbol")}
      </Pill>
      <Pill isActive={value === "flat"} onClick={() => onChange("flat")}>
        {t("flatSymbol")}
      </Pill>
    </PillGroup>
  );
}
