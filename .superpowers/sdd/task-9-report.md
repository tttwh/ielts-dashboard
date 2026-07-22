# Task 9 Report: 60-Day Heatmap And History Summary

## Scope

- Added `Heatmap60` as a compact history section wired into `App`.
- `Heatmap60` calls `buildHeatmapDays(records, today, 60)`.
- Kept rewards out of scope.
- Strengthened `buildHeatmapDays` tests for exact 60-day length, inclusive today, oldest-to-newest order, missing-record level `0`, and 100% level `4`.

## TDD Evidence

- RED: `npm.cmd run test -- src\components\history\Heatmap60.test.tsx src\App.test.tsx`
  - Failed because `src/components/history/Heatmap60.tsx` did not exist.
  - App tests also failed because `History Summary` and `history-heatmap` were not wired.
- GREEN: same targeted command passed after implementing `Heatmap60` and wiring `App`.
- RED regression: `npm.cmd run test -- src\components\history\Heatmap60.test.tsx`
  - Failed on stale active detail after rerender: expected `2026-07-22 - 100% complete`, received `2026-07-22 - 0% complete`.
- GREEN regression: same component command passed after storing the active date key and deriving the detail row from current heatmap days.
- Note: domain heatmap helper already existed from Task 2, so the strengthened domain tests passed before production domain edits; no production change was needed in `src/domain/progress.ts`.

## Final Command Results

- `npm.cmd run test -- src\domain\progress.test.ts`: PASS, 1 file / 9 tests.
- `npm.cmd run test`: PASS, 14 files / 54 tests.
- `npm.cmd run build`: PASS, TypeScript and Vite production build completed.
- `npm.cmd run test:e2e`: PASS, 12 Playwright tests.

## Desktop And Mobile Checks

- Desktop project `chromium-desktop` passed the heatmap e2e path.
- Mobile project `chromium-mobile` passed the heatmap e2e path at `390x844`.
- E2E verifies 60 heatmap cells, today cell update from `0%` to `13%`, focus detail text, document-level no horizontal overflow, and heatmap strip fitting within the viewport.

## Concerns

- Existing untracked `.superpowers/sdd/review-task-*` and task brief files were present before this task and were left untouched except for this new report file.
- No rewards/history achievement behavior was added, per Task 9 scope.
