# IELTS Liquid Glass Multipage Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing IELTS dashboard from a single crowded page into a multi-view SPA with an IELTS-inspired light liquid-glass visual system.

**Architecture:** Keep the current React + TypeScript + Vite app and LocalStorage data model. Do not add React Router; implement lightweight hash-based view switching so reloads and links preserve the active page. Reuse existing feature components, move composition into focused page components, and apply shared glass design tokens through CSS utilities and existing Tailwind classes.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS v4, Vitest, React Testing Library, Playwright, LocalStorage, lucide-react.

## Global Constraints

- Use **方案 A: IELTS Light Glass Dashboard** as the visual direction.
- Use IELTS-inspired black, white, blue, and purple. Do not use the IELTS logo or imply official affiliation.
- Use light liquid-glass effects as a restrained interface layer, not as low-contrast decoration.
- Keep data entry controls readable: inputs and selects must stay high contrast on near-white surfaces.
- Keep cards at `8px` radius to match the existing design constraints.
- Do not add decorative orbs, bokeh blobs, or heavy hero-style gradients.
- Preserve existing LocalStorage keys: `ielts-dashboard-state` and `ielts-dashboard-language`.
- Preserve existing data behavior: target scores, daily goals, records, timer sessions, XP, achievements, and language selection must continue to persist.
- Implement six internal views: `Overview`, `Check-in`, `Timer`, `Progress`, `Rewards`, `Settings`.
- Desktop navigation: left glass sidebar with all six views.
- Mobile navigation: compact horizontal tab strip for all six views, with no horizontal body overflow.
- Use the existing `lucide-react` dependency for icons.
- Keep Chinese and English visible copy covered by the existing i18n layer.
- Do not implement real cloud sync in this pass; Settings may show cloud sync as a future/local-ready item only.
- Verification must include unit tests, build, E2E tests, desktop browser check, mobile browser check, console-error check, and main interaction flows.

---

## File Structure

Create:

- `src/domain/navigation.ts`: typed view IDs, hash parsing, and mobile/desktop navigation lists.
- `src/domain/navigation.test.ts`: tests for hash parsing and navigation defaults.
- `src/components/layout/AppNavigation.tsx`: desktop sidebar and mobile tab navigation.
- `src/components/layout/PageHeader.tsx`: reusable per-view title, description, and optional action area.
- `src/pages/OverviewPage.tsx`: compact summary page with today focus, section minutes, recent progress, and reward preview.
- `src/pages/CheckInPage.tsx`: page wrapper for `DailyCheckIn`.
- `src/pages/TimerPage.tsx`: page wrapper for `StudyTimerPanel`.
- `src/pages/ProgressPage.tsx`: page wrapper for `Heatmap60` and progress metrics.
- `src/pages/RewardsPage.tsx`: page wrapper for `RewardsPanel`.
- `src/pages/SettingsPage.tsx`: page wrapper for `TargetDashboard`, language switch, and local/cloud-ready storage notes.
- `src/pages/OverviewPage.test.tsx`: overview page rendering tests.

Modify:

- `src/App.tsx`: replace all-in-one composition with active-view routing and page composition.
- `src/App.test.tsx`: update app tests for navigation and page-specific workflows.
- `src/styles.css`: add IELTS light-glass tokens and reusable glass utilities.
- `src/components/layout/AppShell.tsx`: support navigation, summary strip, and active view layout.
- `src/components/summary/SummaryHeader.tsx`: convert to compact glass summary bar suitable across pages.
- `src/components/checkin/DailyCheckIn.tsx`: apply glass panel styling and improve mobile density.
- `src/components/timer/StudyTimerPanel.tsx`: apply glass styling and keep timer controls readable.
- `src/components/history/Heatmap60.tsx`: apply blue-purple glass heatmap presentation.
- `src/components/rewards/RewardsPanel.tsx`: apply glass reward-card presentation.
- `src/components/targets/TargetDashboard.tsx`: move naturally into Settings page and apply glass styling.
- `src/components/ui/Button.tsx`: add glass-aware primary and secondary variants.
- `src/components/ui/Badge.tsx`: add glass tone support without breaking existing tones.
- `src/components/ui/NumberField.tsx`: keep high-contrast inputs and add stronger focus states.
- `src/components/language/LanguageToggle.tsx`: make it work as a settings control and compact summary action.
- `src/i18n/translations.ts`: add navigation labels, page titles, overview copy, and settings copy in English/Chinese.
- `tests/e2e/dashboard.spec.ts`: update E2E coverage for multi-view navigation, desktop/mobile overflow, and workflows.
- `README.md`: optionally update current status to mention multi-view layout after implementation.

---

### Task 1: Add Typed View Navigation Domain

**Files:**
- Create: `src/domain/navigation.ts`
- Create: `src/domain/navigation.test.ts`

**Interfaces:**
- Produces: `DashboardView`
- Produces: `DASHBOARD_VIEWS`
- Produces: `PRIMARY_MOBILE_VIEWS`
- Produces: `SETTINGS_VIEW`
- Produces: `normalizeDashboardView(value)`
- Produces: `viewFromHash(hash)`
- Produces: `hashForView(view)`

- [ ] **Step 1: Write failing navigation tests**

Create `src/domain/navigation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_VIEWS,
  hashForView,
  normalizeDashboardView,
  viewFromHash
} from "./navigation";

describe("dashboard navigation", () => {
  it("keeps the expected six dashboard views in order", () => {
    expect(DASHBOARD_VIEWS).toEqual([
      "overview",
      "checkin",
      "timer",
      "progress",
      "rewards",
      "settings"
    ]);
  });

  it("defaults unknown view values to overview", () => {
    expect(normalizeDashboardView(undefined)).toBe("overview");
    expect(normalizeDashboardView("")).toBe("overview");
    expect(normalizeDashboardView("bad-view")).toBe("overview");
  });

  it("normalizes valid view values", () => {
    expect(normalizeDashboardView("timer")).toBe("timer");
    expect(normalizeDashboardView("settings")).toBe("settings");
  });

  it("parses hash links into dashboard views", () => {
    expect(viewFromHash("#timer")).toBe("timer");
    expect(viewFromHash("#/progress")).toBe("progress");
    expect(viewFromHash("#bad")).toBe("overview");
  });

  it("builds hash links for views", () => {
    expect(hashForView("checkin")).toBe("#checkin");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npm.cmd run test -- src/domain/navigation.test.ts
```

Expected: FAIL because `src/domain/navigation.ts` does not exist.

- [ ] **Step 3: Implement navigation domain**

Create `src/domain/navigation.ts`:

```ts
export const DASHBOARD_VIEWS = [
  "overview",
  "checkin",
  "timer",
  "progress",
  "rewards",
  "settings"
] as const;

export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const PRIMARY_MOBILE_VIEWS: readonly DashboardView[] = [
  "overview",
  "checkin",
  "timer",
  "progress",
  "rewards"
];

export const SETTINGS_VIEW: DashboardView = "settings";

const viewSet = new Set<string>(DASHBOARD_VIEWS);

export function normalizeDashboardView(value: string | null | undefined): DashboardView {
  return value && viewSet.has(value) ? (value as DashboardView) : "overview";
}

export function viewFromHash(hash: string): DashboardView {
  const normalizedHash = hash.replace(/^#\/?/, "").trim();
  return normalizeDashboardView(normalizedHash);
}

export function hashForView(view: DashboardView): string {
  return `#${view}`;
}
```

- [ ] **Step 4: Verify navigation domain**

Run:

```powershell
npm.cmd run test -- src/domain/navigation.test.ts
```

Expected: PASS.

---

### Task 2: Extend I18n Copy For Navigation, Pages, And Settings

**Files:**
- Modify: `src/i18n/translations.ts`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardView` string IDs.
- Produces: `t.navigation.viewLabel(view)`
- Produces: `t.navigation.viewDescription(view)`
- Produces: `t.navigation.consoleTitle`
- Produces: `t.navigation.settings`
- Produces: `t.overview.*`
- Produces: `t.settings.*`

- [ ] **Step 1: Add failing app assertions for navigation copy**

In `src/App.test.tsx`, add this test near the language-switching test:

```ts
it("renders localized multipage navigation labels", async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole("navigation", { name: "Dashboard sections" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Overview" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Check-in" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Timer" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Progress" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Rewards" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "中" }));

  expect(screen.getByRole("navigation", { name: "看板页面" })).toBeVisible();
  expect(screen.getByRole("link", { name: "总览" })).toBeVisible();
  expect(screen.getByRole("link", { name: "打卡" })).toBeVisible();
  expect(screen.getByRole("link", { name: "计时" })).toBeVisible();
  expect(screen.getByRole("link", { name: "进度" })).toBeVisible();
  expect(screen.getByRole("link", { name: "奖励" })).toBeVisible();
  expect(screen.getByRole("link", { name: "设置" })).toBeVisible();
});
```

- [ ] **Step 2: Run the failing app test**

Run:

```powershell
npm.cmd run test -- src/App.test.tsx
```

Expected: FAIL because navigation copy has not been added yet.

- [ ] **Step 3: Extend `I18nText`**

Add this to `I18nText` in `src/i18n/translations.ts`:

```ts
  navigation: {
    regionLabel: string;
    consoleTitle: string;
    viewLabel(view: string): string;
    viewDescription(view: string): string;
    settings: string;
  };
  overview: {
    title: string;
    description: string;
    todayFocus: string;
    sectionBalance: string;
    recentProgress: string;
    rewardPreview: string;
    openView(viewLabel: string): string;
  };
  settings: {
    title: string;
    description: string;
    languageTitle: string;
    languageDescription: string;
    targetsTitle: string;
    storageTitle: string;
    storageDescription: string;
    localStateKey: string;
    languageKey: string;
    cloudReady: string;
  };
```

- [ ] **Step 4: Add dictionaries and translation functions**

Add dictionaries before `translations`:

```ts
const navigationText = {
  en: {
    overview: ["Overview", "Today goals, score targets, streak, and study pulse."],
    checkin: ["Check-in", "Record today's core IELTS practice tasks."],
    timer: ["Timer", "Track focused Listening, Speaking, Reading, and Writing time."],
    progress: ["Progress", "Review the latest 60 local study days."],
    rewards: ["Rewards", "Follow XP, levels, and achievement unlocks."],
    settings: ["Settings", "Adjust targets, language, and local data preferences."]
  },
  zh: {
    overview: ["总览", "查看今日目标、分数目标、连续学习和学习状态。"],
    checkin: ["打卡", "记录今天的雅思核心练习任务。"],
    timer: ["计时", "记录听、说、读、写四科专注学习时长。"],
    progress: ["进度", "查看最近 60 天本地学习记录。"],
    rewards: ["奖励", "查看经验值、等级和成就解锁。"],
    settings: ["设置", "调整目标、语言和本地数据偏好。"]
  }
} as const;

const navigationLabel =
  (language: Language) => (view: string) =>
    navigationText[language][view as keyof typeof navigationText.en]?.[0] ?? view;

const navigationDescription =
  (language: Language) => (view: string) =>
    navigationText[language][view as keyof typeof navigationText.en]?.[1] ?? "";
```

Add English entries:

```ts
    navigation: {
      regionLabel: "Dashboard sections",
      consoleTitle: "Prep Console",
      viewLabel: navigationLabel("en"),
      viewDescription: navigationDescription("en"),
      settings: "Settings"
    },
    overview: {
      title: "Overview",
      description: "A compact command center for today's IELTS preparation.",
      todayFocus: "Today focus",
      sectionBalance: "Section balance",
      recentProgress: "Recent progress",
      rewardPreview: "Reward preview",
      openView: (viewLabel) => `Open ${viewLabel}`
    },
    settings: {
      title: "Settings",
      description: "Control targets, language, and local-first storage.",
      languageTitle: "Language",
      languageDescription: "Switch visible dashboard copy between Chinese and English.",
      targetsTitle: "Targets and daily goals",
      storageTitle: "Local data",
      storageDescription: "This version stores study data in the current browser.",
      localStateKey: "Study data key: ielts-dashboard-state",
      languageKey: "Language key: ielts-dashboard-language",
      cloudReady: "Cloud sync is planned, not active."
    },
```

Add Chinese entries:

```ts
    navigation: {
      regionLabel: "看板页面",
      consoleTitle: "备考控制台",
      viewLabel: navigationLabel("zh"),
      viewDescription: navigationDescription("zh"),
      settings: "设置"
    },
    overview: {
      title: "总览",
      description: "集中查看今天的雅思备考状态。",
      todayFocus: "今日重点",
      sectionBalance: "四科均衡",
      recentProgress: "近期进度",
      rewardPreview: "奖励预览",
      openView: (viewLabel) => `打开${viewLabel}`
    },
    settings: {
      title: "设置",
      description: "管理目标、语言和本地优先数据。",
      languageTitle: "语言",
      languageDescription: "在中文和英文看板文案之间切换。",
      targetsTitle: "目标和每日任务",
      storageTitle: "本地数据",
      storageDescription: "当前版本会把学习数据保存在当前浏览器。",
      localStateKey: "学习数据 key：ielts-dashboard-state",
      languageKey: "语言 key：ielts-dashboard-language",
      cloudReady: "云同步已规划，当前尚未启用。"
    },
```

- [ ] **Step 5: Verify i18n type coverage**

Run:

```powershell
npm.cmd run test -- src/App.test.tsx
```

Expected: Still FAIL until navigation components exist, but TypeScript should not report missing translation properties once the components are added in the next task.

---

### Task 3: Build Multipage App Shell And Navigation

**Files:**
- Create: `src/components/layout/AppNavigation.tsx`
- Create: `src/components/layout/PageHeader.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardView`, `DASHBOARD_VIEWS`, `hashForView`.
- Produces: `AppShell({ activeView, onViewChange, summary, children })`.
- Produces: accessible navigation buttons with `aria-current="page"` on active view.

- [ ] **Step 1: Create `PageHeader`**

Create `src/components/layout/PageHeader.tsx`:

```tsx
import type { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="glass-panel flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-normal text-ielts-blue">
          {t.navigation.consoleTitle}
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-7 text-ink">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-muted">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Create `AppNavigation`**

Create `src/components/layout/AppNavigation.tsx`:

```tsx
import {
  BarChart3,
  CalendarCheck,
  Clock3,
  Gauge,
  Settings,
  Trophy
} from "lucide-react";
import type { DashboardView } from "../../domain/navigation";
import { DASHBOARD_VIEWS, hashForView } from "../../domain/navigation";
import { useI18n } from "../../i18n/I18nProvider";

interface AppNavigationProps {
  activeView: DashboardView;
  onViewChange(view: DashboardView): void;
}

const icons = {
  overview: Gauge,
  checkin: CalendarCheck,
  timer: Clock3,
  progress: BarChart3,
  rewards: Trophy,
  settings: Settings
} satisfies Record<DashboardView, typeof Gauge>;

export function AppNavigation({ activeView, onViewChange }: AppNavigationProps) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t.navigation.regionLabel}
      className="glass-nav min-w-0"
      data-testid="dashboard-navigation"
    >
      <div className="hidden min-w-0 p-2 lg:block">
        <div className="hidden px-2 py-2 lg:block">
          <p className="text-xs font-semibold uppercase tracking-normal text-ielts-blue">
            IELTS
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{t.navigation.consoleTitle}</p>
        </div>
        <div className="mt-2 min-w-0 overflow-x-auto overscroll-x-contain lg:overflow-visible">
          <div className="flex min-w-max gap-1 lg:grid lg:min-w-0">
          {DASHBOARD_VIEWS.map((view) => {
            const Icon = icons[view];
            const isActive = view === activeView;

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={`nav-link ${isActive ? "nav-link--active" : ""}`}
                href={hashForView(view)}
                key={view}
                onClick={(event) => {
                  event.preventDefault();
                  onViewChange(view);
                }}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={2.25} />
                <span>{t.navigation.viewLabel(view)}</span>
              </a>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Modify `AppShell`**

Replace `src/components/layout/AppShell.tsx` with:

```tsx
import type { ReactNode } from "react";
import type { DashboardView } from "../../domain/navigation";
import { AppNavigation } from "./AppNavigation";

interface AppShellProps {
  activeView: DashboardView;
  children: ReactNode;
  onViewChange(view: DashboardView): void;
  summary: ReactNode;
}

export function AppShell({ activeView, children, onViewChange, summary }: AppShellProps) {
  return (
    <div className="liquid-app min-h-dvh overflow-x-hidden text-ink">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-3 sm:px-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:py-5">
        <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
          <AppNavigation activeView={activeView} onViewChange={onViewChange} />
        </aside>
        <div className="grid min-w-0 gap-4">
          <header>{summary}</header>
          <main className="min-w-0" data-testid={`page-${activeView}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add active-view state in `App.tsx`**

In `src/App.tsx`, import:

```ts
import { useEffect, useMemo, useState } from "react";
import type { DashboardView } from "./domain/navigation";
import { hashForView, viewFromHash } from "./domain/navigation";
```

Inside `DashboardApp`, add:

```ts
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    viewFromHash(globalThis.location?.hash ?? "")
  );

  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(viewFromHash(globalThis.location.hash));
    };

    globalThis.addEventListener("hashchange", handleHashChange);
    return () => globalThis.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);
    if (globalThis.location.hash !== hashForView(view)) {
      globalThis.history.pushState(null, "", hashForView(view));
    }
  };
```

Pass these props to `AppShell`:

```tsx
    <AppShell
      activeView={activeView}
      onViewChange={handleViewChange}
      summary={
        <SummaryHeader
          level={level}
          state={state}
          streakDays={streakDays}
          summary={summary}
          xp={xp}
        />
      }
    >
      {/* active page rendering is added in Task 4 */}
    </AppShell>
```

- [ ] **Step 5: Verify navigation rendering test**

Run:

```powershell
npm.cmd run test -- src/domain/navigation.test.ts src/App.test.tsx
```

Expected: navigation domain PASS. App tests may still FAIL until pages are split in Task 4.

---

### Task 4: Split The Dashboard Into Six Page Components

**Files:**
- Create: `src/pages/OverviewPage.tsx`
- Create: `src/pages/CheckInPage.tsx`
- Create: `src/pages/TimerPage.tsx`
- Create: `src/pages/ProgressPage.tsx`
- Create: `src/pages/RewardsPage.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Create: `src/pages/OverviewPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: existing props for `DailyCheckIn`, `StudyTimerPanel`, `Heatmap60`, `RewardsPanel`, and `TargetDashboard`.
- Produces: page-level components that each render one focused workflow.

- [ ] **Step 1: Create page wrapper components**

Create `src/pages/CheckInPage.tsx`:

```tsx
import { DailyCheckIn } from "../components/checkin/DailyCheckIn";
import { PageHeader } from "../components/layout/PageHeader";
import type { DailyGoals, DailyRecord } from "../domain/types";
import type { DailyRecordUpdate } from "../hooks/useDashboardData";
import { useI18n } from "../i18n/I18nProvider";

interface CheckInPageProps {
  dailyGoals: DailyGoals;
  todayRecord: DailyRecord;
  updateTodayRecord(update: DailyRecordUpdate): void;
}

export function CheckInPage(props: CheckInPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader title={t.navigation.viewLabel("checkin")} description={t.navigation.viewDescription("checkin")} />
      <DailyCheckIn {...props} />
    </div>
  );
}
```

Create `src/pages/TimerPage.tsx`:

```tsx
import { PageHeader } from "../components/layout/PageHeader";
import { StudyTimerPanel } from "../components/timer/StudyTimerPanel";
import type { DailyGoals, TimerSession } from "../domain/types";
import { useI18n } from "../i18n/I18nProvider";

interface TimerPageProps {
  dailyGoals: DailyGoals;
  today: string;
  userId: string;
  addTimerSession(session: TimerSession): void;
}

export function TimerPage(props: TimerPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader title={t.navigation.viewLabel("timer")} description={t.navigation.viewDescription("timer")} />
      <StudyTimerPanel {...props} />
    </div>
  );
}
```

Create `src/pages/ProgressPage.tsx`:

```tsx
import { Heatmap60 } from "../components/history/Heatmap60";
import { PageHeader } from "../components/layout/PageHeader";
import type { DailyRecord } from "../domain/types";
import { useI18n } from "../i18n/I18nProvider";

interface ProgressPageProps {
  records: DailyRecord[];
  today: string;
}

export function ProgressPage({ records, today }: ProgressPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader title={t.navigation.viewLabel("progress")} description={t.navigation.viewDescription("progress")} />
      <Heatmap60 records={records} today={today} />
    </div>
  );
}
```

Create `src/pages/RewardsPage.tsx`:

```tsx
import { PageHeader } from "../components/layout/PageHeader";
import { RewardsPanel } from "../components/rewards/RewardsPanel";
import type { Achievement } from "../domain/types";
import { useI18n } from "../i18n/I18nProvider";

interface RewardsPageProps {
  achievements: Achievement[];
  latestUnlockedAchievementId?: string | null;
  level: number;
  xp: number;
}

export function RewardsPage(props: RewardsPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader title={t.navigation.viewLabel("rewards")} description={t.navigation.viewDescription("rewards")} />
      <RewardsPanel {...props} />
    </div>
  );
}
```

Create `src/pages/SettingsPage.tsx`:

```tsx
import { LanguageToggle } from "../components/language/LanguageToggle";
import { PageHeader } from "../components/layout/PageHeader";
import { TargetDashboard } from "../components/targets/TargetDashboard";
import type { DailyGoals, UserProfile } from "../domain/types";
import type { DailyGoalsUpdate, ProfileUpdate } from "../hooks/useDashboardData";
import { useI18n } from "../i18n/I18nProvider";

interface SettingsPageProps {
  dailyGoals: DailyGoals;
  profile: UserProfile;
  updateDailyGoals(update: DailyGoalsUpdate): void;
  updateProfile(update: ProfileUpdate): void;
}

export function SettingsPage({
  dailyGoals,
  profile,
  updateDailyGoals,
  updateProfile
}: SettingsPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <section className="glass-panel p-4" aria-labelledby="language-settings-heading">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 id="language-settings-heading" className="text-base font-semibold text-ink">
              {t.settings.languageTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">{t.settings.languageDescription}</p>
          </div>
          <LanguageToggle />
        </div>
      </section>
      <TargetDashboard
        dailyGoals={dailyGoals}
        profile={profile}
        updateDailyGoals={updateDailyGoals}
        updateProfile={updateProfile}
      />
      <section className="glass-panel p-4" aria-labelledby="storage-settings-heading">
        <h3 id="storage-settings-heading" className="text-base font-semibold text-ink">
          {t.settings.storageTitle}
        </h3>
        <p className="mt-1 text-sm text-muted">{t.settings.storageDescription}</p>
        <div className="mt-3 grid gap-2 font-mono text-xs font-semibold text-ink">
          <span>{t.settings.localStateKey}</span>
          <span>{t.settings.languageKey}</span>
          <span className="text-ielts-purple">{t.settings.cloudReady}</span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `OverviewPage`**

Create `src/pages/OverviewPage.tsx`:

```tsx
import { ArrowRight, BarChart3, CalendarCheck, Clock3, Trophy } from "lucide-react";
import type { CompletionSummary, DailyGoals, DailyRecord, IeltsSection } from "../domain/types";
import type { DashboardView } from "../domain/navigation";
import { IELTS_SECTIONS } from "../domain/defaults";
import { useI18n } from "../i18n/I18nProvider";
import { formatMinutes, formatPercent } from "../lib/format";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/layout/PageHeader";

interface OverviewPageProps {
  dailyGoals: DailyGoals;
  level: number;
  onViewChange(view: DashboardView): void;
  streakDays: number;
  summary: CompletionSummary;
  todayRecord: DailyRecord;
  xp: number;
}

const sectionTotal = (record: DailyRecord, section: IeltsSection) =>
  record.sectionMinutes[section];

export function OverviewPage({
  dailyGoals,
  level,
  onViewChange,
  streakDays,
  summary,
  todayRecord,
  xp
}: OverviewPageProps) {
  const { t } = useI18n();
  const totalMinutes = IELTS_SECTIONS.reduce(
    (total, section) => total + sectionTotal(todayRecord, section),
    0
  );

  const quickCards = [
    {
      id: "checkin" as const,
      icon: CalendarCheck,
      label: t.overview.todayFocus,
      value: formatPercent(summary.completionRate),
      detail: todayRecord.isAllClear ? t.checkIn.allClear : t.checkIn.studyTimePending
    },
    {
      id: "timer" as const,
      icon: Clock3,
      label: t.timer.title,
      value: formatMinutes(totalMinutes),
      detail: t.timer.description
    },
    {
      id: "progress" as const,
      icon: BarChart3,
      label: t.overview.recentProgress,
      value: t.summary.streakDays(streakDays),
      detail: t.navigation.viewDescription("progress")
    },
    {
      id: "rewards" as const,
      icon: Trophy,
      label: t.overview.rewardPreview,
      value: t.summary.levelValue(level),
      detail: `${xp} ${t.units.xp}`
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader title={t.overview.title} description={t.overview.description} />
      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label={t.overview.title}>
        {quickCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              className="glass-panel group min-h-[9rem] min-w-0 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-glass-hover focus:outline-none focus:ring-2 focus:ring-ielts-blue focus:ring-offset-2"
              key={card.id}
              onClick={() => onViewChange(card.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-grid h-9 w-9 place-items-center rounded-[8px] border border-blue-100 bg-blue-50 text-ielts-blue">
                  <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
                </span>
                <ArrowRight aria-hidden="true" className="text-muted transition group-hover:translate-x-0.5 group-hover:text-ielts-purple" size={16} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-muted">
                {card.label}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">{card.value}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{card.detail}</p>
            </button>
          );
        })}
      </section>
      <section className="glass-panel p-4" aria-label={t.overview.sectionBalance}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-ink">{t.overview.sectionBalance}</h3>
          <Button onClick={() => onViewChange("timer")} variant="secondary">
            {t.overview.openView(t.navigation.viewLabel("timer"))}
          </Button>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {IELTS_SECTIONS.map((section) => {
            const actual = todayRecord.sectionMinutes[section];
            const target = dailyGoals.sectionMinutesTarget[section];
            const progress = target <= 0 ? 0 : Math.min(actual / target, 1);

            return (
              <div className="rounded-[8px] border border-white/70 bg-white/70 p-3" key={section}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{t.sections[section]}</span>
                  <span className="font-mono text-xs font-semibold text-ielts-purple">
                    {actual}/{target} {t.units.minutesShort}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ielts-blue to-ielts-purple"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add overview page test**

Create `src/pages/OverviewPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals } from "../domain/defaults";
import type { CompletionSummary, DailyRecord } from "../domain/types";
import { I18nProvider } from "../i18n/I18nProvider";
import { OverviewPage } from "./OverviewPage";

const todayRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-24",
  words: 0,
  speakingTopics: 0,
  listeningTests: 0,
  corpusMinutes: 0,
  sectionMinutes: {
    listening: 10,
    speaking: 0,
    reading: 20,
    writing: 0
  },
  readingOvertimeMinutes: 0,
  completionRate: 0.25,
  isAllClear: false,
  xpEarned: 25,
  createdAt: "2026-07-24T00:00:00.000Z",
  updatedAt: "2026-07-24T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
};

const summary: CompletionSummary = {
  completionRate: 0.25,
  enabledGoalCount: 8,
  isAllClear: false,
  isBalancedDay: false,
  itemProgress: {}
};

describe("OverviewPage", () => {
  it("renders compact overview cards and section balance", () => {
    render(
      <I18nProvider>
        <OverviewPage
          dailyGoals={createDefaultDailyGoals("2026-07-24T00:00:00.000Z")}
          level={2}
          onViewChange={vi.fn()}
          streakDays={3}
          summary={summary}
          todayRecord={todayRecord}
          xp={130}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();
    expect(screen.getByText("25%")).toBeVisible();
    expect(screen.getByText("30m")).toBeVisible();
    expect(screen.getByText("Listening")).toBeVisible();
    expect(screen.getByText("Reading")).toBeVisible();
  });
});
```

- [ ] **Step 4: Render active page in `App.tsx`**

Replace the existing all-in-one children inside `AppShell` with:

```tsx
      {activeView === "overview" ? (
        <OverviewPage
          dailyGoals={state.dailyGoals}
          level={level}
          onViewChange={handleViewChange}
          streakDays={streakDays}
          summary={summary}
          todayRecord={todayRecord}
          xp={xp}
        />
      ) : null}
      {activeView === "checkin" ? (
        <CheckInPage
          dailyGoals={state.dailyGoals}
          todayRecord={todayRecord}
          updateTodayRecord={updateTodayRecord}
        />
      ) : null}
      {activeView === "timer" ? (
        <TimerPage
          addTimerSession={addTimerSession}
          dailyGoals={state.dailyGoals}
          today={currentDate}
          userId={state.profile.userId}
        />
      ) : null}
      {activeView === "progress" ? (
        <ProgressPage records={state.records} today={currentDate} />
      ) : null}
      {activeView === "rewards" ? (
        <RewardsPage
          achievements={state.achievements}
          latestUnlockedAchievementId={latestUnlockedAchievementId}
          level={level}
          xp={xp}
        />
      ) : null}
      {activeView === "settings" ? (
        <SettingsPage
          dailyGoals={state.dailyGoals}
          profile={state.profile}
          updateDailyGoals={updateDailyGoals}
          updateProfile={updateProfile}
        />
      ) : null}
```

Add imports for all page components.

- [ ] **Step 5: Verify page rendering**

Run:

```powershell
npm.cmd run test -- src/pages/OverviewPage.test.tsx src/App.test.tsx
```

Expected: OverviewPage test PASS. App tests will need page navigation updates in Task 7.

---

### Task 5: Add IELTS Light Glass Design Tokens And Utilities

**Files:**
- Modify: `src/styles.css`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/NumberField.tsx`
- Modify: `src/components/language/LanguageToggle.tsx`

**Interfaces:**
- Produces: `.liquid-app`
- Produces: `.glass-panel`
- Produces: `.glass-nav`
- Produces: `.nav-link`, `.nav-link--active`
- Produces: `.page-stack`
- Produces: `shadow-glass-soft` and `shadow-glass-hover` through `@theme`

- [ ] **Step 1: Add glass tokens to `src/styles.css`**

In `@theme`, add or update:

```css
  --color-ink: #111827;
  --color-muted: #526174;
  --color-line: #dbe7f5;
  --color-soft-line: #eaf1fb;
  --color-ielts-blue: #1e40af;
  --color-ielts-blue-soft: #3b82f6;
  --color-ielts-purple: #6d28d9;
  --color-ielts-cyan: #0f766e;
  --color-surface: #f6f9ff;
  --color-panel: rgba(255, 255, 255, 0.78);
  --shadow-glass-soft: 0 18px 50px rgba(30, 64, 175, 0.10), 0 1px 0 rgba(255, 255, 255, 0.82) inset;
  --shadow-glass-hover: 0 22px 60px rgba(30, 64, 175, 0.15), 0 1px 0 rgba(255, 255, 255, 0.90) inset;
```

- [ ] **Step 2: Add liquid glass CSS utilities**

In `@layer components`, add:

```css
  .liquid-app {
    background:
      linear-gradient(135deg, rgba(30, 64, 175, 0.08), transparent 32%),
      linear-gradient(215deg, rgba(109, 40, 217, 0.08), transparent 34%),
      linear-gradient(180deg, #ffffff 0%, #f6f9ff 42%, #eef4ff 100%);
  }

  .glass-panel,
  .glass-nav {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(219, 231, 245, 0.82);
    border-radius: 8px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.66)),
      rgba(255, 255, 255, 0.72);
    box-shadow: var(--shadow-glass-soft);
    backdrop-filter: blur(18px) saturate(1.35);
    -webkit-backdrop-filter: blur(18px) saturate(1.35);
  }

  .page-stack {
    display: grid;
    min-width: 0;
    gap: 1rem;
  }

  .nav-link {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.55rem;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--color-muted);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1.25rem;
    text-decoration: none;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .nav-link {
    min-height: 2.75rem;
    padding: 0.55rem 0.75rem;
    white-space: nowrap;
  }

  .nav-link:hover {
    border-color: rgba(59, 130, 246, 0.24);
    background: rgba(255, 255, 255, 0.72);
    color: var(--color-ink);
  }

  .nav-link--active {
    border-color: rgba(30, 64, 175, 0.22);
    background: linear-gradient(135deg, rgba(30, 64, 175, 0.12), rgba(109, 40, 217, 0.10));
    color: var(--color-ielts-blue);
    box-shadow: 0 8px 24px rgba(30, 64, 175, 0.10);
  }

  @media (min-width: 1024px) {
    .nav-link {
      width: 100%;
      padding: 0.65rem 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    ::before,
    ::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 1ms !important;
    }
  }
```

- [ ] **Step 3: Update reusable UI components**

In `Button.tsx`, use:

```ts
const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border-ielts-blue bg-gradient-to-r from-ielts-blue to-ielts-purple text-white shadow-sm hover:brightness-105",
  secondary:
    "border-white/70 bg-white/70 text-ink shadow-sm hover:border-blue-200 hover:bg-white"
};
```

Also update the button class:

```tsx
className={`inline-flex h-10 items-center justify-center rounded-[8px] border px-3 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-ielts-blue focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
```

In `Badge.tsx`, replace tone classes with glass-aware tones:

```ts
const tones: Record<BadgeTone, string> = {
  neutral: "border-white/70 bg-white/70 text-muted",
  blue: "border-blue-200 bg-blue-50/80 text-ielts-blue",
  purple: "border-purple-200 bg-purple-50/80 text-ielts-purple",
  success: "border-emerald-200 bg-emerald-50/85 text-emerald-700"
};
```

In `NumberField.tsx`, update the input wrapper to:

```tsx
<div className="mt-1 flex min-w-0 items-center rounded-[8px] border border-line bg-white/90 shadow-sm focus-within:border-ielts-blue focus-within:ring-2 focus-within:ring-blue-100">
```

In `LanguageToggle.tsx`, update the wrapper to:

```tsx
className="inline-flex h-9 shrink-0 overflow-hidden rounded-[8px] border border-white/70 bg-white/70 p-0.5 shadow-sm"
```

And active class to:

```tsx
? "bg-gradient-to-r from-ielts-blue to-ielts-purple text-white shadow-sm"
: "text-muted hover:bg-white hover:text-ink"
```

- [ ] **Step 4: Verify reusable UI type safety**

Run:

```powershell
npm.cmd run build
```

Expected: PASS.

---

### Task 6: Apply Glass Styling To Existing Feature Components

**Files:**
- Modify: `src/components/summary/SummaryHeader.tsx`
- Modify: `src/components/checkin/DailyCheckIn.tsx`
- Modify: `src/components/timer/StudyTimerPanel.tsx`
- Modify: `src/components/history/Heatmap60.tsx`
- Modify: `src/components/rewards/RewardsPanel.tsx`
- Modify: `src/components/targets/TargetDashboard.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `.glass-panel`, existing component props.
- Produces: visually consistent IELTS Light Glass modules.

- [ ] **Step 1: Convert major sections to glass panels**

For each major component, replace this class pattern:

```tsx
className="min-w-0 rounded-[8px] border border-line bg-white shadow-sm"
```

With:

```tsx
className="glass-panel"
```

Apply this replacement in:

- `SummaryHeader.tsx`
- `DailyCheckIn.tsx`
- `StudyTimerPanel.tsx`
- `Heatmap60.tsx`
- `RewardsPanel.tsx`
- `TargetDashboard.tsx`

- [ ] **Step 2: Update section separators**

Replace strong separators:

```tsx
border-b border-line
divide-y divide-line
border-t border-line
xl:border-l
```

With the same utilities but ensure they render over glass:

```tsx
border-b border-white/70
divide-y divide-white/70
border-t border-white/70
xl:border-l xl:border-white/70
```

- [ ] **Step 3: Update heatmap color scale**

In `Heatmap60.tsx`, replace `levelClasses` with:

```ts
const levelClasses: Record<HeatmapDay["level"], string> = {
  0: "border-[#d9e4f2] bg-[#eef4fb]",
  1: "border-blue-200 bg-blue-200",
  2: "border-blue-300 bg-blue-400",
  3: "border-violet-300 bg-violet-500",
  4: "border-[#1e1b4b] bg-gradient-to-br from-ielts-blue to-ielts-purple"
};
```

- [ ] **Step 4: Update reward badge classes**

In `RewardsPanel.tsx`, update:

```ts
const unlockedClasses = isLatest
  ? "border-purple-300 bg-purple-50/90 text-ielts-purple reward-badge--pulse"
  : "border-blue-200 bg-blue-50/85 text-ielts-blue";
const lockedClasses = "border-white/70 bg-white/60 text-muted opacity-75";
```

- [ ] **Step 5: Add subtle glass motion**

In `src/styles.css`, add:

```css
  .glass-panel {
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .glass-panel:hover {
    border-color: rgba(147, 197, 253, 0.82);
    box-shadow: var(--shadow-glass-hover);
  }
```

- [ ] **Step 6: Verify component tests**

Run:

```powershell
npm.cmd run test -- src/components/summary/SummaryHeader.test.tsx src/components/checkin/DailyCheckIn.test.tsx src/components/timer/StudyTimerPanel.test.tsx src/components/history/Heatmap60.test.tsx src/components/rewards/RewardsPanel.test.tsx src/components/targets/TargetDashboard.test.tsx
```

Expected: PASS.

---

### Task 7: Update App Tests For Multipage Workflows

**Files:**
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: navigation buttons from `AppNavigation`.
- Produces: test coverage for default Overview page, navigation, persistence, check-in, timer, settings, and language.

- [ ] **Step 1: Add a test helper**

In `src/App.test.tsx`, add:

```ts
const openView = async (name: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("link", { name }));
};
```

If Testing Library resolves nav items as links instead of buttons, use `getByRole("link", { name })` consistently. If they resolve with icon text duplicated, use:

```ts
screen.getAllByRole("link", { name })[0]
```

- [ ] **Step 2: Update default composition test**

Change the first app test so the default page expects:

```ts
expect(screen.getByTestId("page-overview")).toBeVisible();
expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();
expect(screen.queryByTestId("daily-checkin")).not.toBeInTheDocument();
expect(screen.getByRole("link", { name: "Check-in" })).toBeVisible();
expect(screen.getByRole("link", { name: "Timer" })).toBeVisible();
expect(screen.getByRole("link", { name: "Progress" })).toBeVisible();
expect(screen.getByRole("link", { name: "Rewards" })).toBeVisible();
expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
```

- [ ] **Step 3: Update language test**

After switching to Chinese, expect:

```ts
expect(screen.getByRole("heading", { name: "总览" })).toBeVisible();
expect(screen.getByRole("link", { name: "打卡" })).toBeVisible();
expect(screen.getByRole("link", { name: "计时" })).toBeVisible();
expect(screen.getByRole("link", { name: "进度" })).toBeVisible();
expect(screen.getByRole("link", { name: "奖励" })).toBeVisible();
expect(screen.getByRole("link", { name: "设置" })).toBeVisible();
```

- [ ] **Step 4: Update check-in test**

Before interacting with daily check-in inputs, open the Check-in view:

```ts
await openView("Check-in");
```

Then keep the existing All Clear assertions.

- [ ] **Step 5: Update manual timer test**

Before interacting with timer inputs, open the Timer view:

```ts
await openView("Timer");
```

Before asserting pending study time, either open Check-in or assert through persisted data. Prefer UI flow:

```ts
await openView("Check-in");
expect(screen.getByText("Listening 0/45 min")).toBeVisible();
await openView("Timer");
```

- [ ] **Step 6: Update target/settings persistence test**

Open Settings before target edits:

```ts
await openView("Settings");
setNumberField("Total band", "7.0");
setNumberField("Words", "120");
await openView("Check-in");
setNumberField("Words actual", "120");
await openView("Timer");
```

After rerender, open Settings and Check-in as needed before asserting the fields.

- [ ] **Step 7: Verify updated app tests**

Run:

```powershell
npm.cmd run test -- src/App.test.tsx src/pages/OverviewPage.test.tsx
```

Expected: PASS.

---

### Task 8: Update Playwright E2E For Multipage And Mobile

**Files:**
- Modify: `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: hash-based navigation and page test IDs.
- Produces: E2E coverage for page loading, navigation, workflows, mobile overflow, and console errors.

- [ ] **Step 1: Update load test**

Replace expectations in `"dashboard loads"` with:

```ts
await expect(page.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
await expect(page.getByTestId("page-overview")).toBeVisible();
await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
await expect(page.getByRole("navigation", { name: "Dashboard sections" })).toBeVisible();
```

- [ ] **Step 2: Add navigation test**

Add:

```ts
test("switches between dashboard views and preserves hash on reload", async ({ page }) => {
  await loadDashboard(page);

  await page.getByRole("link", { name: "Timer" }).click();
  await expect(page.getByTestId("page-timer")).toBeVisible();
  await expect(page).toHaveURL(/#timer$/);

  await page.reload();
  await expect(page.getByTestId("page-timer")).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByTestId("page-settings")).toBeVisible();
});
```

- [ ] **Step 3: Update workflow tests**

For target score test:

```ts
await page.getByRole("link", { name: "Settings" }).click();
```

For daily check-in test:

```ts
await page.getByRole("link", { name: "Check-in" }).click();
```

For manual external time test:

```ts
await page.getByRole("link", { name: "Check-in" }).click();
await expect(page.getByTestId("checkin-study-time-status")).toContainText("Writing 0/45 min");
await page.getByRole("link", { name: "Timer" }).click();
```

After recording, open Check-in:

```ts
await page.getByRole("link", { name: "Check-in" }).click();
await expect(page.getByTestId("checkin-study-time-status")).toContainText("Writing 15/45 min");
```

- [ ] **Step 4: Update accessibility test**

Open each page and run unlabeled-control check:

```ts
for (const view of ["Overview", "Check-in", "Timer", "Progress", "Rewards", "Settings"]) {
  await page.getByRole("link", { name: view }).click();
  const unlabeledControls = await page.evaluate(() => {
    const unlabeledButtons = [...document.querySelectorAll("button")].filter(
      (button) => !button.textContent?.trim() && !button.getAttribute("aria-label")
    ).length;
    const unlabeledInputs = [...document.querySelectorAll("input, select, textarea")].filter(
      (control) => {
        const id = control.getAttribute("id");
        const hasLabel = id
          ? Boolean(document.querySelector(`label[for='${CSS.escape(id)}']`))
          : Boolean(control.closest("label"));
        return (
          !hasLabel &&
          !control.getAttribute("aria-label") &&
          !control.getAttribute("aria-labelledby")
        );
      }
    ).length;

    return unlabeledButtons + unlabeledInputs;
  });

  expect(unlabeledControls, `${view} has unlabeled controls`).toBe(0);
}
```

- [ ] **Step 5: Verify E2E**

Run:

```powershell
npm.cmd run test:e2e
```

Expected: PASS on desktop and mobile projects.

---

### Task 9: Full Verification And Browser Visual Review

**Files:**
- Modify only files with issues found during verification.

**Interfaces:**
- Produces: validated multipage liquid-glass dashboard.

- [ ] **Step 1: Run unit tests**

Run:

```powershell
npm.cmd run test
```

Expected: all Vitest tests PASS.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: TypeScript and Vite build PASS.

- [ ] **Step 3: Run E2E tests**

Run:

```powershell
npm.cmd run test:e2e
```

Expected: Playwright desktop and mobile projects PASS with no console/page errors.

- [ ] **Step 4: Start local dev server**

Run:

```powershell
npm.cmd run dev
```

Expected: Vite serves the app at `http://127.0.0.1:5173/` or reports the actual available port.

- [ ] **Step 5: Desktop visual review**

Open desktop viewport `1440x900`.

Expected:

- Left navigation appears as a glass sidebar.
- Summary bar stays compact and does not crowd the page.
- Overview, Check-in, Timer, Progress, Rewards, and Settings are reachable.
- Glass styling is visible but text and inputs remain high contrast.
- No obvious text overlap, button overflow, or layout shift.
- Console has no obvious errors.

- [ ] **Step 6: Mobile visual review**

Open mobile viewport `390x844`.

Expected:

- No horizontal body overflow.
- Navigation remains usable without clipping page content.
- Buttons and inputs are at least 44px tall where interactive.
- Timer controls wrap cleanly.
- Settings page forms remain readable.
- Heatmap only scrolls inside its own strip if needed.
- Console has no obvious errors.

- [ ] **Step 7: Manual interaction review**

Manually verify:

1. Switch language to Chinese and back to English.
2. Open Settings, change target band, refresh, and confirm persistence.
3. Open Check-in, update words, and confirm Today completion changes.
4. Open Timer, add manual Reading minutes, then open Check-in and confirm section minutes update.
5. Open Progress and confirm today heatmap cell reflects nonzero completion.
6. Open Rewards and confirm XP/achievement state remains visible.

Expected: every workflow works with no console errors and no lost LocalStorage data.

---

## Self-Review

**Spec coverage:** This plan covers方案 A liquid-glass styling, IELTS-inspired colors, multiple internal pages, navigation, Settings separation, persistence preservation, bilingual copy, desktop/mobile layouts, and verification.

**Placeholder scan:** The plan has no open placeholder work. Each task names exact files, exact interfaces, and concrete verification commands.

**Type consistency:** Navigation types are defined once in `src/domain/navigation.ts` and consumed by `AppShell`, `AppNavigation`, `OverviewPage`, and `App.tsx`.

**Scope note:** This is a UI architecture refactor plus visual redesign. It intentionally does not add real cloud sync, new chart libraries, React Router, or server-side storage.

## Execution Gate

Do not execute this plan until the user confirms. Recommended execution mode: `superpowers:subagent-driven-development` if available, otherwise `superpowers:executing-plans`.
