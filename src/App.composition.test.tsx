import { render } from "@testing-library/react";
import type { ReactNode } from "react";
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
    checkInPageProps: vi.fn(),
    createLocalStorageRepository: vi.fn(() => fakeRepository),
    fakeRepository,
    overviewPageProps: vi.fn(),
    progressPageProps: vi.fn(),
    rewardsPageProps: vi.fn(),
    settingsPageProps: vi.fn(),
    studyTimerPageProps: vi.fn(),
    summaryHeaderProps: vi.fn(),
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
    activeView,
    children,
    onViewChange,
    summary
  }: {
    activeView: string;
    children: ReactNode;
    onViewChange(view: string): void;
    summary: ReactNode;
  }) => {
    mocks.appShellProps({ activeView, children, onViewChange, summary });

    return (
      <div data-testid="mock-app-shell">
        <div data-testid="mock-summary-slot">{summary}</div>
        <main>{children}</main>
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

vi.mock("./pages/OverviewPage", () => ({
  OverviewPage: (props: Record<string, unknown>) => {
    mocks.overviewPageProps(props);

    return <div data-testid="mock-overview-page" />;
  }
}));

vi.mock("./pages/CheckInPage", () => ({
  CheckInPage: (props: Record<string, unknown>) => {
    mocks.checkInPageProps(props);

    return <div data-testid="mock-check-in-page" />;
  }
}));

vi.mock("./pages/TimerPage", () => ({
  TimerPage: (props: Record<string, unknown>) => {
    mocks.studyTimerPageProps(props);

    return <div data-testid="mock-timer-page" />;
  }
}));

vi.mock("./pages/ProgressPage", () => ({
  ProgressPage: (props: Record<string, unknown>) => {
    mocks.progressPageProps(props);

    return <div data-testid="mock-progress-page" />;
  }
}));

vi.mock("./pages/RewardsPage", () => ({
  RewardsPage: (props: Record<string, unknown>) => {
    mocks.rewardsPageProps(props);

    return <div data-testid="mock-rewards-page" />;
  }
}));

vi.mock("./pages/SettingsPage", () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    mocks.settingsPageProps(props);

    return <div data-testid="mock-settings-page" />;
  }
}));

import App from "./App";

function arrangeDashboardData() {
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

  state.records = [{ ...todayRecord, xpEarned: 135 }];
  mocks.useDashboardData.mockReturnValue({
    addTimerSession,
    latestUnlockedAchievementId: "first-steps",
    state,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord
  });

  return {
    addTimerSession,
    state,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord
  };
}

describe("App composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("creates the local storage repository and wires summary plus default overview", () => {
    const data = arrangeDashboardData();

    render(<App />);

    expect(mocks.createLocalStorageRepository).toHaveBeenCalledTimes(1);
    expect(mocks.useDashboardData).toHaveBeenCalledWith(
      mocks.fakeRepository satisfies AppRepository,
      "2026-07-22"
    );
    expect(mocks.appShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        activeView: "overview",
        children: expect.anything(),
        onViewChange: expect.any(Function),
        summary: expect.anything()
      })
    );
    expect(mocks.summaryHeaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 2,
        state: data.state,
        xp: 135
      })
    );
    expect(mocks.overviewPageProps).toHaveBeenCalledWith(
      expect.objectContaining({
        dailyGoals: data.state.dailyGoals,
        level: 2,
        onViewChange: expect.any(Function),
        streakDays: 0,
        todayRecord: data.todayRecord,
        xp: 135
      })
    );
    expect(mocks.checkInPageProps).not.toHaveBeenCalled();
  });

  it("wires the check-in page when the check-in route is active", () => {
    const data = arrangeDashboardData();
    window.history.replaceState(null, "", "#checkin");

    render(<App />);

    expect(mocks.checkInPageProps).toHaveBeenCalledWith({
      dailyGoals: data.state.dailyGoals,
      todayRecord: data.todayRecord,
      updateTodayRecord: data.updateTodayRecord
    });
  });

  it("wires the timer page when the timer route is active", () => {
    const data = arrangeDashboardData();
    window.history.replaceState(null, "", "#timer");

    render(<App />);

    expect(mocks.studyTimerPageProps).toHaveBeenCalledWith({
      addTimerSession: data.addTimerSession,
      dailyGoals: data.state.dailyGoals,
      today: "2026-07-22",
      userId: data.state.profile.userId
    });
  });

  it("wires the progress page when the progress route is active", () => {
    const data = arrangeDashboardData();
    window.history.replaceState(null, "", "#progress");

    render(<App />);

    expect(mocks.progressPageProps).toHaveBeenCalledWith({
      records: data.state.records,
      today: "2026-07-22"
    });
  });

  it("wires the rewards page when the rewards route is active", () => {
    const data = arrangeDashboardData();
    window.history.replaceState(null, "", "#rewards");

    render(<App />);

    expect(mocks.rewardsPageProps).toHaveBeenCalledWith({
      achievements: data.state.achievements,
      latestUnlockedAchievementId: "first-steps",
      level: 2,
      xp: 135
    });
  });

  it("wires the settings page when the settings route is active", () => {
    const data = arrangeDashboardData();
    window.history.replaceState(null, "", "#settings");

    render(<App />);

    expect(mocks.settingsPageProps).toHaveBeenCalledWith({
      dailyGoals: data.state.dailyGoals,
      profile: data.state.profile,
      updateDailyGoals: data.updateDailyGoals,
      updateProfile: data.updateProfile
    });
  });
});
