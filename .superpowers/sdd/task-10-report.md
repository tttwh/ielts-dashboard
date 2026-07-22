# Task 10 Report: Achievement Rewards And Lightweight XP Leveling

## What I Implemented

- Added `src/domain/achievements.ts` with canonical first-version badges:
  - `First Check-in`
  - `All Clear`
  - `7-Day Streak`
  - `14-Day Streak`
  - `Reading Discipline`
  - `Listening Builder`
  - `Speaking Starter`
  - `Writing Keeper`
  - `Balanced Day`
  - `60-Day Witness`
- Added `evaluateAchievements(input): Achievement[]`.
- Preserved existing `unlockedAt`, `updatedAt`, and `syncStatus` when an achievement was already unlocked.
- Added legacy carry-forward from old `first-all-clear` persisted data into the new `All Clear` badge.
- Moved initial achievement creation to the achievement domain so defaults and evaluation use one badge source.
- Integrated achievement evaluation into `useDashboardData` state commits so record, goal, and timer updates can unlock rewards automatically.
- Added `latestUnlockedAchievementId` from the hook for the latest unlock pulse.
- Added compact `RewardsPanel` with level, XP progress to next level, unlocked row, locked muted row, and latest unlock highlight.
- Replaced the App sidebar placeholder with `RewardsPanel`.
- Extended e2e All Clear coverage to assert rewards unlock state, XP progress, and desktop/mobile viewport fit.

## What I Tested And Exact Results

- `npm.cmd run test -- src/domain/achievements.test.ts`
  - PASS: 1 file / 6 tests.
- `npm.cmd run test`
  - PASS: 16 files / 62 tests.
- `npm.cmd run build`
  - PASS: `tsc -b && vite build`, Vite build completed in 1.49s.
- `npm.cmd run test:e2e`
  - PASS: 12 Playwright tests.
  - Covered `chromium-desktop` and `chromium-mobile`, including All Clear rewards unlock and no viewport overflow.
- `git diff --check`
  - PASS: no whitespace errors.
  - Output included only Git line-ending warnings for Windows checkout behavior.

## TDD Evidence

### RED

- Domain RED:
  - Command: `npm.cmd run test -- src/domain/achievements.test.ts`
  - Result: FAIL, 1 failed suite / 0 tests.
  - Expected failure: Vite could not resolve `./achievements` because `src/domain/achievements.ts` did not exist yet.
- Component RED:
  - Command: `npm.cmd run test -- src/components/rewards/RewardsPanel.test.tsx`
  - Result: FAIL, 1 failed suite / 0 tests.
  - Expected failure: Vite could not resolve `./RewardsPanel` because the component did not exist yet.
- Integration RED:
  - Command: `npm.cmd run test -- src/hooks/useDashboardData.test.tsx src/App.test.tsx`
  - Result: FAIL, 2 failed files; 3 failed tests / 8 passed.
  - Expected failures:
    - Hook did not automatically persist `all-clear` unlocks after record updates.
    - Existing manual unlock logic did not know the new `all-clear` id.
    - App did not render `rewards-panel`.

### GREEN

- Domain GREEN:
  - Command: `npm.cmd run test -- src/domain/achievements.test.ts`
  - Result: PASS, 1 file / 6 tests.
- Component GREEN:
  - Command: `npm.cmd run test -- src/components/rewards/RewardsPanel.test.tsx`
  - Result: PASS, 1 file / 1 test.
- Integration GREEN:
  - Command: `npm.cmd run test -- src/hooks/useDashboardData.test.tsx src/App.test.tsx`
  - Result: PASS, 2 files / 11 tests.

## Files Changed

- Created: `src/domain/achievements.ts`
- Created: `src/domain/achievements.test.ts`
- Created: `src/components/rewards/RewardsPanel.tsx`
- Created: `src/components/rewards/RewardsPanel.test.tsx`
- Modified: `src/domain/defaults.ts`
- Modified: `src/hooks/useDashboardData.ts`
- Modified: `src/hooks/useDashboardData.test.tsx`
- Modified: `src/App.tsx`
- Modified: `src/App.test.tsx`
- Modified: `src/styles.css`
- Modified: `tests/e2e/scaffold.smoke.spec.ts`
- Created: `.superpowers/sdd/task-10-report.md`

## Self-Review Findings

- Badge names match the Task 10 brief verbatim.
- Locked badges remain visible through the canonical 10-badge evaluation result and muted `aria-disabled` UI state.
- Existing `unlockedAt` values are preserved by `evaluateAchievements`, including the regression test for later evaluations with no matching rule progress.
- App tests were correctly scoped to the Daily Check-In region because `All Clear` is now also visible as a locked/unlocked rewards badge.
- No unrelated source files were refactored.

## Issues Or Concerns

- The brief specified exact names and four required rule checks, but did not define thresholds for `14-Day Streak`, the four skill badges, or `60-Day Witness`.
- I used the smallest local-first rules available from existing data:
  - `14-Day Streak`: fourteen consecutive study days.
  - Skill badges: any relevant section/task progress above `0`.
  - `60-Day Witness`: sixty distinct study dates across records and timer sessions.
- Existing untracked `.superpowers/sdd/review-task-*` and task brief files were present before this task and were left untouched.
