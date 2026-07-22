# IELTS Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page IELTS preparation supervision and check-in dashboard with local persistence, cloud-sync-ready data structures, timed study tracking, 60-day history, and a restrained achievement reward system.

**Architecture:** Use a React + TypeScript + Tailwind CSS Vite app. Keep domain logic pure and tested in `src/domain`, isolate browser persistence behind `src/services/storage`, and keep UI components small under `src/components`. Version 1 stores data locally, but every persisted object includes IDs, timestamps, `userId`, and `syncStatus` so Supabase or Firebase can be added later without rewriting business logic.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Vitest, React Testing Library, Playwright, LocalStorage.

## Global Constraints

- Do not implement real cloud sync in v1; implement local-first storage and cloud-sync-ready interfaces.
- Persist target scores, daily goals, daily records, timer sessions, achievements, XP, and streak state across page refreshes.
- Use IELTS-inspired black, white, blue, and purple visual language; do not use IELTS official logo or claim official affiliation.
- Single page only; no landing page.
- Display the latest 60 days in the history heatmap.
- Reading timer uses a 60-minute exam target, alerts at time limit, continues counting, and marks overtime.
- Listening, Speaking, Reading, and Writing each support independent study time tracking.
- External app or external website study time is manual entry only; the browser app must not claim it can automatically read other apps' usage time.
- All Clear is true only when every enabled daily target reaches 100%.
- Completion progress caps every individual goal at 100% before averaging.
- Any daily goal set to `0` is disabled and excluded from completion averaging.
- Frontend verification must include desktop and mobile viewport checks.
- Current workspace is not a git repository; commit steps should be skipped unless implementation starts inside an initialized repository or worktree.

---

## File Structure

Create these files during implementation:

- `package.json`: scripts and dependencies for Vite, React, Tailwind, Vitest, Playwright.
- `index.html`: Vite HTML entry.
- `vite.config.ts`: Vite and Vitest configuration.
- `tailwind.config.ts`: Tailwind content paths and IELTS-inspired theme tokens.
- `postcss.config.js`: Tailwind PostCSS setup.
- `tsconfig.json`: TypeScript project config.
- `tsconfig.node.json`: Vite config TypeScript config.
- `playwright.config.ts`: desktop and mobile browser test config.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: single-page composition and app-level state wiring.
- `src/styles.css`: Tailwind imports, base typography, focus states, animation utilities.
- `src/domain/types.ts`: shared domain types and sync-ready persisted object shapes.
- `src/domain/defaults.ts`: default profile, goals, seed records, section metadata, badge definitions.
- `src/domain/progress.ts`: completion percentage, All Clear, streak, heatmap, and XP calculations.
- `src/domain/achievements.ts`: achievement unlock rules.
- `src/services/storage/storageTypes.ts`: storage adapter interfaces and schema version type.
- `src/services/storage/localStorageAdapter.ts`: versioned LocalStorage read/write adapter.
- `src/services/storage/appRepository.ts`: repository API consumed by React.
- `src/hooks/useDashboardData.ts`: load, update, and persist app data.
- `src/hooks/useStudyTimer.ts`: timer state machine for section timers.
- `src/components/layout/AppShell.tsx`: page shell, header, responsive container.
- `src/components/summary/SummaryHeader.tsx`: target score, today completion, streak, XP, local sync state.
- `src/components/targets/TargetDashboard.tsx`: four section target cards and target editing.
- `src/components/checkin/DailyCheckIn.tsx`: daily numeric tasks and All Clear checkbox feedback.
- `src/components/timer/StudyTimerPanel.tsx`: four-skill timer UI and manual external time entry.
- `src/components/history/Heatmap60.tsx`: 60-day completion graph.
- `src/components/rewards/RewardsPanel.tsx`: unlocked and locked achievements, level progress.
- `src/components/ui/Button.tsx`: reusable button with variants.
- `src/components/ui/NumberField.tsx`: reusable numeric input with validation and step controls.
- `src/components/ui/ProgressRing.tsx`: SVG progress ring for compact score/progress display.
- `src/components/ui/Badge.tsx`: status and achievement badges.
- `src/lib/date.ts`: local date helpers.
- `src/lib/format.ts`: score, percent, duration formatting helpers.
- `src/test/setup.ts`: Testing Library setup.
- `src/domain/progress.test.ts`: pure progress calculation tests.
- `src/domain/achievements.test.ts`: achievement unlock tests.
- `src/services/storage/localStorageAdapter.test.ts`: storage migration and persistence tests.
- `src/hooks/useStudyTimer.test.tsx`: timer behavior tests.
- `tests/e2e/dashboard.spec.ts`: Playwright desktop and mobile user-flow tests.

---

### Task 1: Scaffold The React App And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: Vite app root rendering `<App />`.
- Produces: test commands `npm run test`, `npm run test:e2e`, `npm run build`.

- [ ] **Step 1: Create project configuration**

Add scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

Use dependencies:

```json
{
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "autoprefixer": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Configure Vitest and React**

In `vite.config.ts`, configure React and jsdom:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true
  }
});
```

- [ ] **Step 3: Configure Tailwind theme**

In `tailwind.config.ts`, include:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6B7280",
        line: "#E5E7EB",
        ieltsBlue: "#2855D9",
        ieltsPurple: "#6D28D9",
        surface: "#F8FAFC"
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "8px"
      }
    }
  },
  plugins: []
} satisfies Config;
```

- [ ] **Step 4: Add a minimal app shell**

In `src/App.tsx`, render a clear placeholder:

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-xl font-semibold">IELTS Prep Dashboard</h1>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verify scaffold**

Run: `npm install`  
Expected: dependencies installed without errors.

Run: `npm run build`  
Expected: TypeScript and Vite build complete successfully.

Run: `npm run test`  
Expected: Vitest exits successfully; if no tests exist yet, it should not report TypeScript config errors.

- [ ] **Step 6: Commit if repository exists**

If `git status` works, commit:

```bash
git add package.json index.html vite.config.ts tailwind.config.ts postcss.config.js tsconfig.json tsconfig.node.json playwright.config.ts src
git commit -m "chore: scaffold ielts dashboard app"
```

Expected: commit succeeds. If `git status` reports `not a git repository`, skip this step.

---

### Task 2: Define Domain Types, Defaults, And Pure Calculations

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/defaults.ts`
- Create: `src/domain/progress.ts`
- Create: `src/lib/date.ts`
- Create: `src/lib/format.ts`
- Create: `src/domain/progress.test.ts`

**Interfaces:**
- Produces: `IeltsSection = "listening" | "speaking" | "reading" | "writing"`.
- Produces: `calculateDailyCompletion(record: DailyRecord, goals: DailyGoals): CompletionSummary`.
- Produces: `calculateStreak(records: DailyRecord[], today: string): number`.
- Produces: `buildHeatmapDays(records: DailyRecord[], today: string, days: number): HeatmapDay[]`.
- Produces: `calculateXp(completionRate: number, isAllClear: boolean, isBalancedDay: boolean): number`.

- [ ] **Step 1: Write failing tests for completion logic**

In `src/domain/progress.test.ts`, include these cases:

```ts
import { describe, expect, it } from "vitest";
import { calculateDailyCompletion, calculateXp } from "./progress";
import type { DailyGoals, DailyRecord } from "./types";

const goals: DailyGoals = {
  wordsTarget: 100,
  speakingTopicsTarget: 3,
  listeningTestsTarget: 1,
  corpusMinutesTarget: 30,
  sectionMinutesTarget: {
    listening: 45,
    speaking: 30,
    reading: 60,
    writing: 45
  }
};

const baseRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-22",
  words: 100,
  speakingTopics: 3,
  listeningTests: 1,
  corpusMinutes: 30,
  sectionMinutes: {
    listening: 45,
    speaking: 30,
    reading: 60,
    writing: 45
  },
  readingOvertimeMinutes: 0,
  completionRate: 0,
  isAllClear: false,
  xpEarned: 0,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
};

describe("calculateDailyCompletion", () => {
  it("marks all clear when every enabled target reaches 100 percent", () => {
    const summary = calculateDailyCompletion(baseRecord, goals);
    expect(summary.completionRate).toBe(1);
    expect(summary.isAllClear).toBe(true);
    expect(summary.isBalancedDay).toBe(true);
  });

  it("caps each individual goal at 100 percent before averaging", () => {
    const summary = calculateDailyCompletion(
      { ...baseRecord, words: 1000, speakingTopics: 30 },
      goals
    );
    expect(summary.completionRate).toBe(1);
  });

  it("excludes zero-valued targets from the average", () => {
    const summary = calculateDailyCompletion(baseRecord, {
      ...goals,
      wordsTarget: 0,
      corpusMinutesTarget: 0
    });
    expect(summary.enabledGoalCount).toBe(6);
    expect(summary.completionRate).toBe(1);
  });
});

describe("calculateXp", () => {
  it("adds all clear and balanced day bonuses", () => {
    expect(calculateXp(1, true, true)).toBe(130);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test -- src/domain/progress.test.ts`

Expected: FAIL because `src/domain/types.ts` and `src/domain/progress.ts` do not exist yet.

- [ ] **Step 3: Implement domain types**

In `src/domain/types.ts`, define:

```ts
export type IeltsSection = "listening" | "speaking" | "reading" | "writing";
export type SyncStatus = "local-only" | "synced" | "pending" | "conflict";

export type SectionTargets = Record<IeltsSection, number>;
export type SectionMinutes = Record<IeltsSection, number>;

export interface UserProfile {
  userId: string;
  targetBand: number;
  sectionTargets: SectionTargets;
  syncStatus: "local" | "cloud-ready";
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoals {
  wordsTarget: number;
  speakingTopicsTarget: number;
  listeningTestsTarget: number;
  corpusMinutesTarget: number;
  sectionMinutesTarget: SectionMinutes;
}

export interface DailyRecord {
  recordId: string;
  userId: string;
  date: string;
  words: number;
  speakingTopics: number;
  listeningTests: number;
  corpusMinutes: number;
  sectionMinutes: SectionMinutes;
  readingOvertimeMinutes: number;
  completionRate: number;
  isAllClear: boolean;
  xpEarned: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface TimerSession {
  sessionId: string;
  userId: string;
  date: string;
  section: IeltsSection;
  source: "in-app-timer" | "manual-external";
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: "streak" | "skill" | "milestone" | "balance";
  unlockedAt: string | null;
}

export interface CompletionSummary {
  completionRate: number;
  isAllClear: boolean;
  isBalancedDay: boolean;
  enabledGoalCount: number;
  itemProgress: Record<string, number>;
}

export interface HeatmapDay {
  date: string;
  completionRate: number;
  isAllClear: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}
```

- [ ] **Step 4: Implement calculation functions**

In `src/domain/progress.ts`, implement:

```ts
import type { CompletionSummary, DailyGoals, DailyRecord, HeatmapDay } from "./types";

const clampProgress = (actual: number, target: number) => {
  if (target <= 0) return null;
  return Math.min(Math.max(actual, 0) / target, 1);
};

export function calculateDailyCompletion(record: DailyRecord, goals: DailyGoals): CompletionSummary {
  const progressEntries: Array<[string, number | null]> = [
    ["words", clampProgress(record.words, goals.wordsTarget)],
    ["speakingTopics", clampProgress(record.speakingTopics, goals.speakingTopicsTarget)],
    ["listeningTests", clampProgress(record.listeningTests, goals.listeningTestsTarget)],
    ["corpusMinutes", clampProgress(record.corpusMinutes, goals.corpusMinutesTarget)],
    ["listeningMinutes", clampProgress(record.sectionMinutes.listening, goals.sectionMinutesTarget.listening)],
    ["speakingMinutes", clampProgress(record.sectionMinutes.speaking, goals.sectionMinutesTarget.speaking)],
    ["readingMinutes", clampProgress(record.sectionMinutes.reading, goals.sectionMinutesTarget.reading)],
    ["writingMinutes", clampProgress(record.sectionMinutes.writing, goals.sectionMinutesTarget.writing)]
  ];

  const enabledEntries = progressEntries.filter((entry): entry is [string, number] => entry[1] !== null);
  const completionRate =
    enabledEntries.length === 0
      ? 0
      : enabledEntries.reduce((sum, [, value]) => sum + value, 0) / enabledEntries.length;

  const itemProgress = Object.fromEntries(enabledEntries);
  const isBalancedDay = Object.values(record.sectionMinutes).every((minutes) => minutes > 0);

  return {
    completionRate,
    isAllClear: enabledEntries.length > 0 && enabledEntries.every(([, value]) => value >= 1),
    isBalancedDay,
    enabledGoalCount: enabledEntries.length,
    itemProgress
  };
}

export function calculateXp(completionRate: number, isAllClear: boolean, isBalancedDay: boolean): number {
  return Math.round(completionRate * 100) + (isAllClear ? 20 : 0) + (isBalancedDay ? 10 : 0);
}

export function heatmapLevel(completionRate: number): HeatmapDay["level"] {
  if (completionRate <= 0) return 0;
  if (completionRate < 0.4) return 1;
  if (completionRate < 0.7) return 2;
  if (completionRate < 1) return 3;
  return 4;
}
```

- [ ] **Step 5: Add date and format helpers**

In `src/lib/date.ts`, expose `todayKey()`, `addDays(dateKey, delta)`, and `lastNDays(today, count)`.

In `src/lib/format.ts`, expose `formatPercent(rate)`, `formatMinutes(minutes)`, and `formatBand(score)` with examples:

```ts
formatPercent(0.756) === "76%"
formatMinutes(90) === "1h 30m"
formatBand(6.5) === "6.5"
```

- [ ] **Step 6: Verify domain logic**

Run: `npm run test -- src/domain/progress.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: TypeScript passes with no type errors.

---

### Task 3: Implement Local Storage Repository With Cloud-Sync-Ready Schema

**Files:**
- Create: `src/services/storage/storageTypes.ts`
- Create: `src/services/storage/localStorageAdapter.ts`
- Create: `src/services/storage/appRepository.ts`
- Create: `src/services/storage/localStorageAdapter.test.ts`
- Modify: `src/domain/defaults.ts`

**Interfaces:**
- Consumes: `UserProfile`, `DailyGoals`, `DailyRecord`, `TimerSession`, `Achievement`.
- Produces: `AppRepository` with `loadAppState(): AppState` and `saveAppState(state: AppState): void`.

- [ ] **Step 1: Write failing storage tests**

In `src/services/storage/localStorageAdapter.test.ts`, verify:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageRepository } from "./appRepository";

describe("local storage repository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default state when storage is empty", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();
    expect(state.profile.userId).toBe("local-user");
    expect(state.records).toEqual([]);
    expect(state.schemaVersion).toBe(1);
  });

  it("persists and reloads app state", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();
    repo.saveAppState({
      ...state,
      profile: { ...state.profile, targetBand: 7 }
    });
    expect(createLocalStorageRepository().loadAppState().profile.targetBand).toBe(7);
  });

  it("recovers from malformed JSON by returning defaults", () => {
    localStorage.setItem("ielts-dashboard-state", "{bad-json");
    const repo = createLocalStorageRepository();
    expect(repo.loadAppState().profile.userId).toBe("local-user");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm run test -- src/services/storage/localStorageAdapter.test.ts`

Expected: FAIL because repository files do not exist.

- [ ] **Step 3: Define storage interfaces**

In `src/services/storage/storageTypes.ts`, define:

```ts
import type { Achievement, DailyGoals, DailyRecord, TimerSession, UserProfile } from "../../domain/types";

export interface AppState {
  schemaVersion: 1;
  profile: UserProfile;
  dailyGoals: DailyGoals;
  records: DailyRecord[];
  timerSessions: TimerSession[];
  achievements: Achievement[];
}

export interface AppRepository {
  loadAppState(): AppState;
  saveAppState(state: AppState): void;
}
```

- [ ] **Step 4: Implement defaults**

In `src/domain/defaults.ts`, define default profile, default daily goals, and initial achievements. Use `new Date().toISOString()` only inside factory functions so tests can create deterministic state later.

Required exports:

```ts
export function createDefaultProfile(now: string): UserProfile;
export function createDefaultDailyGoals(): DailyGoals;
export function createInitialAchievements(): Achievement[];
export function createDefaultAppState(now: string): AppState;
```

- [ ] **Step 5: Implement LocalStorage adapter and repository**

Use storage key:

```ts
const STORAGE_KEY = "ielts-dashboard-state";
```

In `localStorageAdapter.ts`, implement safe JSON parse. On malformed JSON or incompatible schema, return `null`.

In `appRepository.ts`, implement:

```ts
export function createLocalStorageRepository(): AppRepository {
  return {
    loadAppState() {
      return readState() ?? createDefaultAppState(new Date().toISOString());
    },
    saveAppState(state) {
      writeState(state);
    }
  };
}
```

- [ ] **Step 6: Verify storage**

Run: `npm run test -- src/services/storage/localStorageAdapter.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

---

### Task 4: Build App Data Hook And State Update Operations

**Files:**
- Create: `src/hooks/useDashboardData.ts`
- Create: `src/hooks/useDashboardData.test.tsx`
- Modify: `src/domain/progress.ts`
- Modify: `src/services/storage/storageTypes.ts`

**Interfaces:**
- Consumes: `AppRepository`, `AppState`, `calculateDailyCompletion`, `calculateXp`.
- Produces: `useDashboardData()` hook exposing `state`, `todayRecord`, `updateProfile`, `updateDailyGoals`, `updateTodayRecord`, `addTimerSession`, `unlockAchievementsIfNeeded`.

- [ ] **Step 1: Write failing hook tests**

Test that updating today record recalculates completion and persists:

```tsx
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDashboardData } from "./useDashboardData";
import { createMemoryRepository } from "../services/storage/appRepository";

describe("useDashboardData", () => {
  it("updates today record, recalculates completion, and saves state", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, "2026-07-22"));

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(result.current.todayRecord.words).toBe(100);
    expect(repo.loadAppState().records[0].words).toBe(100);
  });
});
```

- [ ] **Step 2: Add memory repository for tests**

In `src/services/storage/appRepository.ts`, add:

```ts
export function createMemoryRepository(initialState?: AppState): AppRepository {
  let state = initialState ?? createDefaultAppState("2026-07-22T00:00:00.000Z");
  return {
    loadAppState: () => state,
    saveAppState: (nextState) => {
      state = nextState;
    }
  };
}
```

- [ ] **Step 3: Implement hook operations**

`updateTodayRecord(partial)` must:

- create today record if missing;
- merge the partial fields;
- recalculate `completionRate`, `isAllClear`, `xpEarned`;
- update `updatedAt`;
- set `syncStatus` to `"local-only"`;
- persist with `repo.saveAppState(nextState)`.

`addTimerSession(session)` must:

- append the session;
- add `actualMinutes` to `sectionMinutes[section]`;
- for reading, update `readingOvertimeMinutes`;
- persist the updated state.

- [ ] **Step 4: Verify hook behavior**

Run: `npm run test -- src/hooks/useDashboardData.test.tsx`

Expected: PASS.

Run: `npm run test`

Expected: all unit tests PASS.

---

### Task 5: Build Layout, Theme, And Summary Header

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/summary/SummaryHeader.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/ProgressRing.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `AppState`, `CompletionSummary`, streak, XP.
- Produces: responsive page shell and top summary.

- [ ] **Step 1: Add reusable UI components**

Create:

```tsx
// Badge.tsx
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "blue" | "purple" | "success" }) {
  const tones = {
    neutral: "border-line bg-white text-muted",
    blue: "border-blue-200 bg-blue-50 text-ieltsBlue",
    purple: "border-purple-200 bg-purple-50 text-ieltsPurple",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
```

Create `ProgressRing.tsx` using SVG circle stroke with `value` from `0` to `1`.

- [ ] **Step 2: Implement AppShell**

Desktop layout:

- max width `1280px`;
- top summary full width;
- main grid with left content and right compact panels;
- no nested cards inside cards.

Mobile layout:

- single column;
- sticky-free layout;
- controls wrap without horizontal scrolling.

- [ ] **Step 3: Implement SummaryHeader**

Show:

- total IELTS target;
- today completion percent;
- streak days;
- XP and level;
- `Local mode · cloud-ready schema` badge.

Use monospace for numbers.

- [ ] **Step 4: Verify visual baseline**

Run: `npm run build`

Expected: PASS.

Run: `npm run dev`

Open desktop viewport `1440x900`. Expected: header fits one row or wraps cleanly, no overlap.

Open mobile viewport `390x844`. Expected: header stacks cleanly, no clipped text, no horizontal scroll.

---

### Task 6: Build Target Dashboard And Daily Goal Editing

**Files:**
- Create: `src/components/targets/TargetDashboard.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/NumberField.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `profile`, `dailyGoals`, `updateProfile`, `updateDailyGoals`.
- Produces: editable total score, four section target scores, and daily target numeric settings.

- [ ] **Step 1: Implement NumberField**

`NumberField` props:

```ts
interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange(value: number): void;
}
```

Validation rules:

- clamp below `min` to `min`;
- clamp above `max` to `max`;
- empty input displays blank while focused but stores previous valid value until blur.

- [ ] **Step 2: Implement score editing**

Target scores:

- total band min `0`, max `9`, step `0.5`;
- section band min `0`, max `9`, step `0.5`.

Daily goals:

- words `0-999`, step `10`;
- speaking topics `0-99`, step `1`;
- listening tests `0-10`, step `1`;
- corpus minutes `0-600`, step `5`;
- each section minutes `0-600`, step `5`.

- [ ] **Step 3: Verify interaction**

Run: `npm run build`

Expected: PASS.

Manual desktop:

- edit total target to `7.0`;
- refresh page;
- expected: `7.0` remains.

Manual mobile:

- edit Reading target score and Reading daily minutes;
- expected: input remains readable and does not overflow.

---

### Task 7: Build Daily Check-In And All Clear Feedback

**Files:**
- Create: `src/components/checkin/DailyCheckIn.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `todayRecord`, `dailyGoals`, `updateTodayRecord`.
- Produces: task progress inputs, animated completion checkbox states, All Clear badge.

- [ ] **Step 1: Implement daily task controls**

Include numeric inputs for:

- today words;
- speaking topics;
- listening test count;
- corpus minutes.

Each row shows:

- task name;
- actual value input;
- target value;
- progress percent;
- animated checkbox icon when actual reaches target.

- [ ] **Step 2: Implement All Clear state**

When `todayRecord.isAllClear` is true:

- show `All Clear` badge near Daily Check-In heading;
- add a short green-blue-purple pulse animation to the badge;
- do not use large confetti or cover the page.

- [ ] **Step 3: Verify check-in**

Run: `npm run test`

Expected: PASS.

Manual desktop:

- fill all enabled goals to target;
- expected: all row checks animate and All Clear badge appears.

Manual mobile:

- fill task inputs using narrow viewport;
- expected: each row remains legible and controls do not overlap.

---

### Task 8: Build Four-Section Study Timer And Manual External Time Entry

**Files:**
- Create: `src/hooks/useStudyTimer.ts`
- Create: `src/hooks/useStudyTimer.test.tsx`
- Create: `src/components/timer/StudyTimerPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `addTimerSession`, `dailyGoals`.
- Produces: start, pause, resume, end-and-record timer flow for all four IELTS sections.

- [ ] **Step 1: Write failing timer tests**

In `src/hooks/useStudyTimer.test.tsx`, cover:

```tsx
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStudyTimer } from "./useStudyTimer";

describe("useStudyTimer", () => {
  it("marks reading overtime after 60 minutes", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useStudyTimer({ section: "reading", plannedMinutes: 60 }));

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(90 * 60 * 1000));

    expect(result.current.elapsedSeconds).toBe(5400);
    expect(result.current.overtimeSeconds).toBe(1800);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Implement timer hook**

States:

- `idle`;
- `running`;
- `paused`;
- `finished`.

Methods:

- `start()`;
- `pause()`;
- `resume()`;
- `finish(): TimerResult`.

`TimerResult` includes:

```ts
{
  actualMinutes: number;
  overtimeMinutes: number;
}
```

- [ ] **Step 3: Implement StudyTimerPanel**

UI requirements:

- segmented control for Listening / Speaking / Reading / Writing;
- large monospace timer;
- start, pause, resume, end-and-record buttons with lucide icons;
- reading planned time defaults to `60`;
- other sections use their daily target minutes as planned time;
- show warning when reading exceeds planned time: `已超时 xx min`;
- manual external entry form with section selector, minutes input, and source label `Manual external time`.

- [ ] **Step 4: Verify timer**

Run: `npm run test -- src/hooks/useStudyTimer.test.tsx`

Expected: PASS.

Manual desktop:

- start Reading timer;
- simulate or wait beyond planned threshold during test mode if a debug shortcut is added;
- expected: overtime label appears and final session adds minutes to Reading.

Manual mobile:

- switch sections and use manual external entry;
- expected: timer controls remain tap-friendly and no text overlaps.

---

### Task 9: Build 60-Day Heatmap And History Summary

**Files:**
- Create: `src/components/history/Heatmap60.tsx`
- Modify: `src/domain/progress.ts`
- Modify: `src/domain/progress.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `buildHeatmapDays(records, today, 60)`.
- Produces: compact GitHub-style 60-day graph with IELTS blue-purple completion levels.

- [ ] **Step 1: Add heatmap tests**

Test:

- exactly 60 days are returned;
- missing records show level `0`;
- 100% completion shows level `4`.

Expected test assertion:

```ts
expect(buildHeatmapDays([], "2026-07-22", 60)).toHaveLength(60);
```

- [ ] **Step 2: Implement heatmap builder**

`buildHeatmapDays` must:

- include today;
- sort oldest to newest;
- use local date keys;
- map missing records to completion `0`.

- [ ] **Step 3: Implement Heatmap60 UI**

Desktop:

- render in rows by week-like columns;
- show date and percent on hover/focus;
- include legend from `0%` to `100%`.

Mobile:

- allow horizontal scroll only inside the heatmap strip if necessary;
- the page itself must not horizontally scroll.

- [ ] **Step 4: Verify heatmap**

Run: `npm run test -- src/domain/progress.test.ts`

Expected: PASS.

Manual desktop:

- inspect recent 60-day graph;
- expected: color levels reflect completion.

Manual mobile:

- viewport `390x844`;
- expected: heatmap remains usable without breaking page width.

---

### Task 10: Build Achievement Rewards And Lightweight XP Leveling

**Files:**
- Create: `src/domain/achievements.ts`
- Create: `src/domain/achievements.test.ts`
- Create: `src/components/rewards/RewardsPanel.tsx`
- Modify: `src/domain/defaults.ts`
- Modify: `src/hooks/useDashboardData.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `DailyRecord[]`, `TimerSession[]`, `Achievement[]`.
- Produces: `evaluateAchievements(input): Achievement[]` and rewards panel.

- [ ] **Step 1: Write achievement tests**

Cover:

- first check-in unlocks after any record has completion above `0`;
- All Clear unlocks after any record has `isAllClear`;
- Balanced Day unlocks when four section minutes are all above `0`;
- 7-day streak unlocks after seven consecutive study days.

- [ ] **Step 2: Implement achievement rules**

First version badges:

- `First Check-in`;
- `All Clear`;
- `7-Day Streak`;
- `14-Day Streak`;
- `Reading Discipline`;
- `Listening Builder`;
- `Speaking Starter`;
- `Writing Keeper`;
- `Balanced Day`;
- `60-Day Witness`.

Rules:

- once `unlockedAt` is set, never reset it;
- locked badges remain visible but muted;
- new unlock triggers a subtle badge pulse.

- [ ] **Step 3: Implement RewardsPanel**

Show:

- current level;
- XP progress to next level;
- unlocked badge row;
- locked badge row;
- latest unlock highlight.

Keep the style compact. Do not use a large gamified inventory page.

- [ ] **Step 4: Verify rewards**

Run: `npm run test -- src/domain/achievements.test.ts`

Expected: PASS.

Manual desktop:

- complete All Clear;
- expected: All Clear achievement unlocks and XP increases.

Manual mobile:

- rewards panel wraps without card text overflow.

---

### Task 11: Compose Final Dashboard And Persist End-To-End User Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: all component imports as needed.

**Interfaces:**
- Consumes: all previous components and hooks.
- Produces: complete single-page dashboard.

- [ ] **Step 1: Wire all modules in App**

`App.tsx` must:

- create repository with `createLocalStorageRepository()`;
- call `useDashboardData(repository)`;
- pass profile and goals to summary and target components;
- pass today record to check-in and timer;
- pass records to heatmap;
- pass achievements and XP to rewards panel.

- [ ] **Step 2: Add empty and first-use states**

When no records exist:

- show today record with zeros;
- show 60-day heatmap as empty gray cells;
- show locked badges;
- show local mode badge.

- [ ] **Step 3: Verify persistence manually**

Run: `npm run dev`

Desktop flow:

1. Set target band to `7.0`.
2. Set words target to `120`.
3. Enter `120` words.
4. Add `30` manual Reading minutes.
5. Refresh browser.

Expected:

- target band remains `7.0`;
- words target remains `120`;
- words record remains `120`;
- Reading minutes remain increased by `30`;
- heatmap for today reflects nonzero completion.

- [ ] **Step 4: Verify mobile layout manually**

Open mobile viewport `390x844`.

Expected:

- no horizontal page scroll;
- all buttons are tappable;
- all numeric inputs fit;
- heatmap does not overlap rewards;
- timer controls wrap cleanly.

---

### Task 12: Add Playwright Desktop And Mobile E2E Checks

**Files:**
- Create: `tests/e2e/dashboard.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: full app.
- Produces: automated desktop and mobile confidence checks.

- [ ] **Step 1: Configure Playwright projects**

Projects:

- `chromium-desktop` with viewport `1440x900`;
- `chromium-mobile` with viewport `390x844`.

- [ ] **Step 2: Write e2e tests**

In `tests/e2e/dashboard.spec.ts`, cover:

- dashboard loads;
- target score can be edited and survives reload;
- daily check-in updates completion;
- manual external time updates section minutes;
- mobile viewport has no horizontal body overflow.

Mobile overflow assertion:

```ts
const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
expect(hasOverflow).toBe(false);
```

- [ ] **Step 3: Run e2e tests**

Run: `npm run test:e2e`

Expected: both desktop and mobile projects PASS.

If Playwright browsers are missing, run:

```bash
npx playwright install chromium
```

Then rerun `npm run test:e2e`.

---

### Task 13: Final Quality Pass

**Files:**
- Modify: `src/styles.css`
- Modify: affected components only if visual or accessibility issues are found.

**Interfaces:**
- Consumes: complete app.
- Produces: production-ready local v1.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run test
npm run build
npm run test:e2e
```

Expected:

- unit tests PASS;
- production build PASS;
- desktop e2e PASS;
- mobile e2e PASS.

- [ ] **Step 2: Manual visual review**

Desktop `1440x900`:

- summary header visible and not oversized;
- dashboard uses compact Notion / Linear-style layout;
- IELTS-inspired blue and purple are accents, not full-page gradients;
- text does not overlap;
- no nested cards.

Mobile `390x844`:

- no horizontal page scroll;
- heatmap remains usable;
- timer buttons fit;
- numeric inputs are readable;
- reward badges wrap cleanly.

- [ ] **Step 3: Accessibility check**

Verify:

- all buttons have visible text or `aria-label`;
- timer controls are keyboard reachable;
- inputs have labels;
- heatmap cells have accessible labels such as `2026-07-22, 76% complete`;
- color is not the only signal for completed tasks.

- [ ] **Step 4: Confirm v1 scope**

Verify the UI clearly says local mode or cloud-ready local mode. It must not imply real cloud sync is active.

Expected visible copy:

```text
Local mode · cloud-ready schema
```

---

## Self-Review

**Spec coverage:** Covered target dashboard, daily check-in, four-skill timer, reading overtime, manual external time, 60-day heatmap, local persistence, cloud-sync-ready schema, IELTS-inspired visual style, All Clear feedback, achievements, XP, desktop and mobile checks.

**Placeholder scan:** No `TBD`, empty `TODO`, or undefined vague tasks remain. Each task lists files, interfaces, implementation details, and verification.

**Type consistency:** The plan consistently uses `DailyRecord`, `DailyGoals`, `TimerSession`, `Achievement`, `AppState`, `AppRepository`, `calculateDailyCompletion`, `calculateXp`, `buildHeatmapDays`, `useDashboardData`, and `useStudyTimer`.

## Execution Gate

Do not execute this plan until the user confirms. After confirmation, use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement it task by task.
