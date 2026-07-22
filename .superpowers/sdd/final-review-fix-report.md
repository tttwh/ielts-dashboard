# Final Review Fix Report

## Findings Fixed

- Important 1: Fixed historical goal mutation by changing `updateDailyGoals` to recalculate only the active record for the current local date. Historical records now keep their stored `completionRate`, `isAllClear`, `xpEarned`, metadata, and sync status when daily goals change.
- Important 2: Added `useCurrentDateKey`, which refreshes the local date key at local midnight. `App` now passes that explicit date into `useDashboardData`, `StudyTimerPanel`, streak calculation, and `Heatmap60`, so first post-midnight check-ins and timer sessions are written to the new date.
- Minor 1: Aligned study-progress semantics by adding shared `hasDailyStudyActivity`. `calculateStreak` now counts raw activity fields and section minutes, even when completion fields are zero because goals are disabled or stale.
- Minor 2: Added `calculateLongestStreak` and changed 7/14-day achievement rules to use the longest consecutive activity run across persisted history. Existing `unlockedAt` preservation remains handled by `evaluateAchievements`.

## Regression Evidence

- Historical goal preservation red test initially failed because the 2026-07-21 record was recalculated from `completionRate: 1` / `isAllClear: true` / `xpEarned: 130` to `0.9375` / `false` / `104`.
- Midnight rollover red test initially failed because the post-midnight timer session was persisted with `date: "2026-07-22"` instead of `date: "2026-07-23"`.
- Raw activity streak red test initially returned `0` instead of `3`.
- Historical longest streak red test initially left 7/14-day streak badges locked.

## Verification

- `npm.cmd run test -- src/hooks/useDashboardData.test.tsx src/hooks/useCurrentDateKey.test.ts src/App.test.tsx src/App.composition.test.tsx`
  - PASS: 4 files / 16 tests.
- `npm.cmd run test -- src/domain/progress.test.ts src/domain/achievements.test.ts`
  - PASS: 2 files / 18 tests.
- `npm.cmd run test`
  - PASS: 18 files / 70 tests.
- `npm.cmd run build`
  - PASS: `tsc -b && vite build`; Vite production build completed.
- `npm.cmd run test:e2e`
  - PASS: 24 Playwright tests across `chromium-desktop` and `chromium-mobile`.
- `git diff --check`
  - PASS: no whitespace errors. Git printed only Windows checkout line-ending warnings.

## Files Changed

- `.superpowers/sdd/final-review-fix-report.md`
- `src/App.composition.test.tsx`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/domain/achievements.test.ts`
- `src/domain/achievements.ts`
- `src/domain/progress.test.ts`
- `src/domain/progress.ts`
- `src/hooks/useCurrentDateKey.test.ts`
- `src/hooks/useCurrentDateKey.ts`
- `src/hooks/useDashboardData.test.tsx`
- `src/hooks/useDashboardData.ts`

## Remaining Concerns

- No remaining concerns for the listed final review findings.
- `.superpowers/sdd/review-final-branch.diff` remains untracked as the supplied review input artifact and was not included in the fix commit.
