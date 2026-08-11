---
name: release-check
description: Verify a phase from docs/roadmap.md is actually complete before marking it done — runs tests, lint, typecheck, build, and a practical check of the feature, then reports regressions/warnings/unfinished work. Use at the end of any significant phase or before telling the user a phase is complete.
---

# Release Check

Verifies a phase is genuinely complete before it's reported as done. Never report success when
verification fails — an honest "not yet" is the only acceptable output when something is broken.

## Steps

1. Identify which phase (from `docs/roadmap.md`) is being checked and re-read its checklist items.
2. Run, in order, stopping to fix and re-run on failure rather than skipping ahead:
   - Automated tests (`npm run test`, or the relevant subset — for music-domain changes, prefer
     also invoking the `music-theory-review` skill first).
   - TypeScript type-check (`npm run typecheck` / `tsc --noEmit`).
   - Lint (`npm run lint`).
   - Production build (`npm run build`).
3. Where practical, exercise the feature itself (not just tests passing) — e.g. start the dev
   server and click through the new flow, or run a script that hits the new domain function with
   real inputs. Type checks and unit tests verify code correctness, not feature correctness; say
   explicitly if UI verification wasn't possible in this environment.
4. Check for regressions in previously working functionality, not just the new phase's own
   checklist — re-run the full test suite, not only new tests.
5. Cross-check the roadmap checklist item-by-item; do not mark an item done if it's partially
   implemented, stubbed, or TODO-commented.

## Output

Report:
- Pass/fail for each of tests, typecheck, lint, build.
- Roadmap checklist items: done vs incomplete, with the specific gap for anything incomplete.
- Any regressions found, with the offending change identified if possible.
- Any warnings (lint warnings, deprecation notices, console errors during manual verification)
  even if they don't block the build.
- A clear final verdict: "phase complete" only if every checklist item is done and all four checks
  pass; otherwise "not yet complete" with the punch list.

Update `docs/roadmap.md` status markers only after a passing check, and log any notable decisions
uncovered during the check.
