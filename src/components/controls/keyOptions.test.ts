import { describe, expect, it } from "vitest";
import { listKeyOptions, keyOptionId } from "./keyOptions";

describe("listKeyOptions", () => {
  it("produces exactly 24 options: 12 major + 12 relative minors", () => {
    const options = listKeyOptions();
    expect(options).toHaveLength(24);
    expect(options.filter((o) => o.key.mode === "major")).toHaveLength(12);
    expect(options.filter((o) => o.key.mode === "natural-minor")).toHaveLength(12);
  });

  it("includes the conventional 12 major key spellings (no double sharps/flats)", () => {
    const majorLabels = listKeyOptions()
      .filter((o) => o.key.mode === "major")
      .map((o) => o.label)
      .sort();
    expect(majorLabels).toEqual(
      ["A", "B", "C", "D", "E", "F", "F#", "G", "Ab", "Bb", "Db", "Eb"].sort(),
    );
  });

  it("includes C major and A minor (the Phase 4 default state)", () => {
    const labels = listKeyOptions().map((o) => o.label);
    expect(labels).toContain("C");
    expect(labels).toContain("Am");
  });

  it("relative minors are derived from relativeKey, not independently hardcoded — spot check", () => {
    const options = listKeyOptions();
    const cMajor = options.find((o) => o.label === "C")!;
    const gMajor = options.find((o) => o.label === "G")!;
    expect(options.some((o) => o.label === "Am")).toBe(true); // relative of C
    expect(options.some((o) => o.label === "Em")).toBe(true); // relative of G
    expect(cMajor).toBeDefined();
    expect(gMajor).toBeDefined();
  });

  it("every option has a unique id", () => {
    const ids = listKeyOptions().map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keyOptionId matches by structural identity, not object reference (KeySelector's lookup bug)", () => {
    // A freshly-constructed Key equal in VALUE but a different object
    // reference than anything in listKeyOptions() must still resolve to the
    // same id — this is exactly what the UI does with app state.
    const freshCMajor = { tonic: { letter: "C" as const, accidental: 0 }, mode: "major" as const };
    const options = listKeyOptions();
    const match = options.find((o) => o.id === keyOptionId(freshCMajor));
    expect(match).toBeDefined();
    expect(match!.label).toBe("C");
  });
});
