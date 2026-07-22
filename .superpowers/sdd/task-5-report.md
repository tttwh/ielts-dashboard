# Task 5 Report: Build Layout, Theme, And Summary Header

## Status

Implemented Task 5 within scope: layout shell, theme/base styles, summary header, reusable badge, reusable progress ring, App composition, and smoke coverage.

## Files Changed

- Created `src/components/layout/AppShell.tsx`
- Created `src/components/layout/AppShell.test.tsx`
- Created `src/components/summary/SummaryHeader.tsx`
- Created `src/components/summary/SummaryHeader.test.tsx`
- Created `src/components/ui/Badge.tsx`
- Created `src/components/ui/Badge.test.tsx`
- Created `src/components/ui/ProgressRing.tsx`
- Created `src/components/ui/ProgressRing.test.tsx`
- Created `src/App.test.tsx`
- Modified `src/App.tsx`
- Modified `src/styles.css`
- Modified `tests/e2e/scaffold.smoke.spec.ts`

## Implementation Notes

- `AppShell` provides a max-width `1280px` page shell with top summary and responsive main/sidebar grid.
- `SummaryHeader` consumes `AppState`, `CompletionSummary`, streak, XP, and level values.
- `App` derives today's completion with `calculateDailyCompletion`, streak with `calculateStreak`, and total XP from active records.
- Tailwind v4 CSS-first tokens remain in `src/styles.css`; no Tailwind v3 config token dependency was added.
- Summary header avoids nested cards: the header is one card-like container, while metrics are plain grouped stats with dividers.
- Placeholder main/sidebar surfaces do not implement target dashboard, check-in, timer, heatmap, or rewards behavior.

## TDD And Verification

Initial RED command:

```text
npm.cmd run test
Result: FAIL as expected. New tests failed because Task 5 components were missing and App did not yet render summary values.
```

Final verification commands:

```text
npm.cmd run test
Result: PASS. 8 test files passed, 28 tests passed.

npm.cmd run build
Result: PASS. TypeScript build and Vite production build completed.

npm.cmd run test:e2e
Result: PASS. 2 Playwright tests passed across chromium-desktop 1440x900 and chromium-mobile 390x844.
```

## Visual And Mobile Checks

- Desktop smoke used viewport `1440x900`.
- Mobile smoke used viewport `390x844`.
- E2E verified the summary header, status badge, progress ring, no horizontal document overflow, and summary bounds within the viewport.
- The e2e script started Vite at `http://127.0.0.1:4173` and stopped it after the run.

## Concerns

- XP level calculation is a simple UI derivation: `floor(totalXp / 100) + 1`. There is no product-level leveling specification yet.
- The main and sidebar areas intentionally remain non-functional layout placeholders until later tasks define those panels.
