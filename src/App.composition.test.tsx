import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAppState } from "./domain/defaults";
import { createEmptyDailyRecord } from "./domain/progress";
import type { AppRepository } from "./services/storage/storageTypes";

const mocks = vi.hoisted(() => {
  const fakeRepository = {
    loadAppState: vi.fn(),
    saveAppState: vi.fn()
  };

  return {
    appShellProps: vi.fn(),
    createLocalStorageRepository: vi.fn(() => fakeRepository),
    dailyCheckInProps: vi.fn(),
    fakeRepository,
    heatmapProps: vi.fn(),
    rewardsProps: vi.fn(),
    studyTimerProps: vi.fn(),
    summaryHeaderProps: vi.fn(),
    targetDashboardProps: vi.fn(),
    useCurrentDateKey: vi.fn(() => "2026-07-22"),
    useDashboardData: vi.fn()
  };
});

vi.mock("./services/storage/appRepository", () => ({
  createLocalStorageRepository: mocks.createLocalStorageRepository
}));

vi.mock("./hooks/useDashboardData", () => ({
  useDashboardData: mocks.useDashboardData
}));

vi.mock("./hooks/useCurrentDateKey", () => ({
  useCurrentDateKey: mocks.useCurrentDateKey
}));

vi.mock("./components/layout/AppShell", () => ({
  AppShell: ({
    children,
    sidebar,
    summary
  }: {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    summary: React.ReactNode;
  }) => {
    mocks.appShellProps({ children, sidebar, summary });

    return (
      <div data-testid="mock-app-shell">
        <div data-testid="mock-summary-slot">{summary}</div>
        <main>{children}</main>
        <aside>{sidebar}</aside>
      </div>
    );
  }
}));

vi.mock("./components/summary/SummaryHeader", () => ({
  SummaryHeader: (props: Record<string, unknown>) => {
    mocks.summaryHeaderProps(props);

    return <div data-testid="mock-summary-header" />;
  }
}));

vi.mock("./components/targets/TargetDashboard", () => ({
  TargetDashboard: (props: Record<string, unknown>) => {
    mocks.targetDashboardProps(props);

    return <div data-testid="mock-target-dashboard" />;
  }
}));

vi.mock("./components/checkin/DailyCheckIn", () => ({
  DailyCheckIn: (props: Record<string, unknown>) => {
    mocks.dailyCheckInProps(props);

    return <div data-testid="mock-daily-check-in" />;
  }
}));

vi.mock("./components/timer/StudyTimerPanel", () => ({
  StudyTimerPanel: (props: Record<string, unknown>) => {
    mocks.studyTimerProps(props);

    return <div data-testid="mock-study-timer-panel" />;
  }
}));

vi.mock("./components/history/Heatmap60", () => ({
  Heatmap60: (props: Record<string, unknown>) => {
    mocks.heatmapProps(props);

    return <div data-testid="mock-heatmap-60" />;
  }
}));

vi.mock("./components/rewards/RewardsPanel", () => ({
  RewardsPanel: (props: Record<string, unknown>) => {
    mocks.rewardsProps(props);

    return <div data-testid="mock-rewards-panel" />;
  }
}));

import App from "./App";

describe("App composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the local storage repository and wires dashboard data into every module", () => {
    const state = createDefaultAppState("2026-07-22T00:00:00.000Z");
    const todayRecord = createEmptyDailyRecord(
      "2026-07-22",
      state.profile.userId,
      "2026-07-22T00:00:00.000Z"
    );
    const updateProfile = vi.fn();
    const updateDailyGoals = vi.fn();
    const updateTodayRecord = vi.fn();
    const addTimerSession = vi.fn();
    const unlockAchievementsIfNeeded = vi.fn();

    state.records = [{ ...todayRecord, xpEarned: 135 }];
    mocks.useDashboardData.mockReturnValue({
      addTimerSession,
      latestUnlockedAchievementId: "first-steps",
      state,
      todayRecord,
      unlockAchievementsIfNeeded,
      updateDailyGoals,
      updateProfile,
      updateTodayRecord
    });

    render(<App />);

    expect(mocks.createLocalStorageRepository).toHaveBeenCalledTimes(1);
    expect(mocks.useDashboardData).toHaveBeenCalledWith(
      mocks.fakeRepository satisfies AppRepository,
      "2026-07-22"
    );
    expect(mocks.appShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.anything(),
        sidebar: expect.anything(),
        summary: expect.anything()
      })
    );
    expect(mocks.summaryHeaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 2,
        state,
        xp: 135
      })
    );
    expect(mocks.targetDashboardProps).toHaveBeenCalledWith({
      dailyGoals: state.dailyGoals,
      profile: state.profile,
      updateDailyGoals,
      updateProfile
    });
    expect(mocks.dailyCheckInProps).toHaveBeenCalledWith({
      dailyGoals: state.dailyGoals,
      todayRecord,
      updateTodayRecord
    });
    expect(mocks.studyTimerProps).toHaveBeenCalledWith({
      addTimerSession,
      dailyGoals: state.dailyGoals,
      today: "2026-07-22",
      userId: state.profile.userId
    });
    expect(mocks.heatmapProps).toHaveBeenCalledWith({
      records: state.records,
      today: "2026-07-22"
    });
    expect(mocks.rewardsProps).toHaveBeenCalledWith({
      achievements: state.achievements,
      latestUnlockedAchievementId: "first-steps",
      level: 2,
      xp: 135
    });
  });
});
