import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAppState } from "./domain/defaults";
import { createEmptyDailyRecord } from "./domain/progress";
import type { SyncState } from "./services/sync/syncTypes";
import type { AppRepository } from "./services/storage/storageTypes";

const mocks = vi.hoisted(() => {
  const fakeRepository = {
    loadAppState: vi.fn(),
    saveAppState: vi.fn()
  };

  return {
    appShellProps: vi.fn(),
    authPanelProps: vi.fn(),
    checkInPageProps: vi.fn(),
    createAuthService: vi.fn(),
    createCloudBaseClient: vi.fn(),
    createCloudRepository: vi.fn(),
    createLocalStorageRepository: vi.fn(() => fakeRepository),
    createSyncManager: vi.fn(),
    fakeAuthService: {
      completeEmailSignUp: vi.fn(),
      getCurrentUser: vi.fn(),
      onAuthStateChanged: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      startEmailSignUp: vi.fn()
    },
    fakeCloudBaseClient: {
      auth: {},
      rdb: vi.fn()
    },
    fakeCloudRepository: {},
    fakeRepository,
    fakeRdb: {},
    fakeSyncManager: {},
    overviewPageProps: vi.fn(),
    progressPageProps: vi.fn(),
    readCloudBaseConfig: vi.fn(),
    rewardsPageProps: vi.fn(),
    settingsPageProps: vi.fn(),
    studyTimerPageProps: vi.fn(),
    summaryHeaderProps: vi.fn(),
    useAuthSession: vi.fn(),
    useCurrentDateKey: vi.fn(() => "2026-07-22"),
    useDashboardData: vi.fn()
  };
});

vi.mock("./services/storage/appRepository", () => ({
  createLocalStorageRepository: mocks.createLocalStorageRepository
}));

vi.mock("./services/cloudbase/authService", () => ({
  createAuthService: mocks.createAuthService
}));

vi.mock("./services/cloudbase/cloudbaseClient", () => ({
  createCloudBaseClient: mocks.createCloudBaseClient,
  readCloudBaseConfig: mocks.readCloudBaseConfig
}));

vi.mock("./services/cloudbase/cloudRepository", () => ({
  createCloudRepository: mocks.createCloudRepository
}));

vi.mock("./services/sync/syncManager", () => ({
  createSyncManager: mocks.createSyncManager
}));

vi.mock("./hooks/useAuthSession", () => ({
  useAuthSession: mocks.useAuthSession
}));

vi.mock("./hooks/useDashboardData", () => ({
  useDashboardData: mocks.useDashboardData
}));

vi.mock("./hooks/useCurrentDateKey", () => ({
  useCurrentDateKey: mocks.useCurrentDateKey
}));

vi.mock("./components/auth/AuthPanel", () => ({
  AuthPanel: (props: Record<string, unknown>) => {
    mocks.authPanelProps(props);

    return <div data-testid="mock-auth-panel" />;
  }
}));

vi.mock("./components/layout/AppShell", () => ({
  AppShell: ({
    activeView,
    authSlot,
    children,
    onViewChange,
    summary,
    syncStatusSlot
  }: {
    activeView: string;
    authSlot?: ReactNode;
    children: ReactNode;
    onViewChange(view: string): void;
    summary: ReactNode;
    syncStatusSlot?: ReactNode;
  }) => {
    mocks.appShellProps({ activeView, authSlot, children, onViewChange, summary, syncStatusSlot });

    return (
      <div data-testid="mock-app-shell">
        <div data-testid="mock-summary-slot">{summary}</div>
        <div data-testid="mock-sync-slot">{syncStatusSlot}</div>
        <div data-testid="mock-auth-slot">{authSlot}</div>
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

function arrangeAuthSession(overrides: Record<string, unknown> = {}) {
  const session = {
    completeEmailSignUp: vi.fn(),
    errorCode: null,
    pendingSignUp: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    startEmailSignUp: vi.fn(),
    status: "guest",
    user: null,
    ...overrides
  };

  mocks.useAuthSession.mockReturnValue(session);

  return session;
}

function arrangeDashboardData(overrides: Record<string, unknown> = {}) {
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
  const enterGuestMode = vi.fn();
  const syncNow = vi.fn().mockResolvedValue(undefined);
  const syncState: SyncState = {
    lastSyncedAt: null,
    message: null,
    mode: "guest"
  };

  state.records = [{ ...todayRecord, xpEarned: 135 }];
  const dashboardData = {
    addTimerSession,
    enterGuestMode,
    latestUnlockedAchievementId: "first-steps",
    state,
    syncNow,
    syncState,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord,
    ...overrides
  };

  mocks.useDashboardData.mockReturnValue(dashboardData);

  return {
    dashboardData,
    addTimerSession,
    enterGuestMode,
    state,
    syncNow,
    syncState,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord
  };
}

describe("App composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.fakeCloudBaseClient.rdb.mockReturnValue(mocks.fakeRdb);
    mocks.createAuthService.mockReturnValue(mocks.fakeAuthService);
    mocks.createCloudBaseClient.mockReturnValue(mocks.fakeCloudBaseClient);
    mocks.createCloudRepository.mockReturnValue(mocks.fakeCloudRepository);
    mocks.createSyncManager.mockReturnValue(mocks.fakeSyncManager);
    mocks.readCloudBaseConfig.mockImplementation(() => {
      throw new Error("VITE_CLOUDBASE_ENV_ID is required");
    });
    window.history.replaceState(null, "", "/");
  });

  it("creates the local storage repository and wires summary plus default overview", () => {
    const data = arrangeDashboardData();
    const authSession = arrangeAuthSession();

    render(<App />);

    expect(mocks.createLocalStorageRepository).toHaveBeenCalledTimes(1);
    expect(mocks.createCloudBaseClient).not.toHaveBeenCalled();
    expect(mocks.useDashboardData).toHaveBeenCalledWith(
      mocks.fakeRepository satisfies AppRepository,
      "2026-07-22",
      undefined
    );
    expect(mocks.appShellProps).toHaveBeenCalledWith(
      expect.objectContaining({
        activeView: "overview",
        authSlot: expect.anything(),
        children: expect.anything(),
        onViewChange: expect.any(Function),
        summary: expect.anything(),
        syncStatusSlot: expect.anything()
      })
    );
    expect(mocks.authPanelProps).toHaveBeenCalledWith(
      expect.objectContaining({
        accountName: null,
        errorMessage: null,
        onCompleteEmailSignUp: authSession.completeEmailSignUp,
        onSignIn: authSession.signIn,
        onSignOut: authSession.signOut,
        onStartEmailSignUp: authSession.startEmailSignUp,
        pendingSignUpEmail: null,
        status: "guest"
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

  it("maps auth error codes to localized auth panel messages", () => {
    localStorage.setItem("ielts-dashboard-language", "zh");
    arrangeDashboardData();
    arrangeAuthSession({
      errorCode: "authentication-failed",
      status: "error"
    });

    render(<App />);

    expect(mocks.authPanelProps).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: "认证失败。",
        status: "error"
      })
    );
  });

  it("creates CloudBase services when config exists and syncs authenticated users", async () => {
    const cloudConfig = {
      accessKey: "publishable-test-key",
      envId: "test-env",
      region: "ap-shanghai"
    };
    mocks.readCloudBaseConfig.mockReturnValue(cloudConfig);
    const data = arrangeDashboardData();
    const authSession = arrangeAuthSession({
      status: "authenticated",
      user: {
        accountName: null,
        email: "weihao@example.com",
        uid: "cloud-user-1",
        username: null
      }
    });

    render(<App />);

    expect(mocks.createCloudBaseClient).toHaveBeenCalledWith(cloudConfig);
    expect(mocks.createAuthService).toHaveBeenCalledWith(mocks.fakeCloudBaseClient.auth);
    expect(mocks.fakeCloudBaseClient.rdb).toHaveBeenCalledOnce();
    expect(mocks.createCloudRepository).toHaveBeenCalledWith(mocks.fakeRdb);
    expect(mocks.createSyncManager).toHaveBeenCalledWith(mocks.fakeCloudRepository);
    expect(mocks.useAuthSession).toHaveBeenCalledWith(mocks.fakeAuthService);
    expect(mocks.useDashboardData).toHaveBeenCalledWith(
      mocks.fakeRepository satisfies AppRepository,
      "2026-07-22",
      mocks.fakeSyncManager
    );
    expect(mocks.authPanelProps).toHaveBeenCalledWith(
      expect.objectContaining({
        accountName: "weihao@example.com",
        status: "authenticated"
      })
    );
    await waitFor(() => {
      expect(data.syncNow).toHaveBeenCalledWith("cloud-user-1", "weihao@example.com");
    });
    expect(authSession.user).toMatchObject({ uid: "cloud-user-1" });
  });

  it("auto-syncs authenticated local edits after sync state turns offline", async () => {
    const cloudConfig = {
      accessKey: "publishable-test-key",
      envId: "test-env",
      region: "ap-shanghai"
    };
    mocks.readCloudBaseConfig.mockReturnValue(cloudConfig);
    const data = arrangeDashboardData({
      syncState: {
        lastSyncedAt: "2026-07-22T07:59:00.000Z",
        message: null,
        mode: "synced"
      }
    });
    arrangeAuthSession({
      status: "authenticated",
      user: {
        accountName: null,
        email: "weihao@example.com",
        uid: "cloud-user-1",
        username: null
      }
    });
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(data.syncNow).toHaveBeenCalledWith("cloud-user-1", "weihao@example.com");
    });
    data.syncNow.mockClear();

    data.dashboardData.syncState = {
      lastSyncedAt: "2026-07-22T07:59:00.000Z",
      message: null,
      mode: "offline"
    };
    rerender(<App />);

    await waitFor(() => {
      expect(data.syncNow).toHaveBeenCalledWith("cloud-user-1", "weihao@example.com");
    });
    expect(data.syncNow).toHaveBeenCalledTimes(1);
  });

  it("tells dashboard data to return to guest sync mode when auth is unauthenticated", async () => {
    const data = arrangeDashboardData();
    arrangeAuthSession({
      status: "guest",
      user: null
    });

    render(<App />);

    await waitFor(() => {
      expect(data.enterGuestMode).toHaveBeenCalledOnce();
    });
    expect(data.syncNow).not.toHaveBeenCalled();
  });

  it("wires the check-in page when the check-in route is active", () => {
    const data = arrangeDashboardData();
    arrangeAuthSession();
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
    arrangeAuthSession();
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
    arrangeAuthSession();
    window.history.replaceState(null, "", "#progress");

    render(<App />);

    expect(mocks.progressPageProps).toHaveBeenCalledWith({
      records: data.state.records,
      today: "2026-07-22"
    });
  });

  it("wires the rewards page when the rewards route is active", () => {
    const data = arrangeDashboardData();
    arrangeAuthSession();
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
    arrangeAuthSession();
    window.history.replaceState(null, "", "#settings");

    render(<App />);

    expect(mocks.settingsPageProps).toHaveBeenCalledWith({
      dailyGoals: data.state.dailyGoals,
      cloudbaseConfigured: false,
      profile: data.state.profile,
      syncState: data.syncState,
      updateDailyGoals: data.updateDailyGoals,
      updateProfile: data.updateProfile
    });
  });

  it("localizes blocked account sync codes instead of showing English sync-layer text", () => {
    localStorage.setItem("ielts-dashboard-language", "zh");
    arrangeDashboardData({
      syncState: {
        code: "account-disabled",
        lastSyncedAt: null,
        message: "Cloud sync is blocked for disabled accounts.",
        mode: "error"
      }
    });
    arrangeAuthSession();

    render(<App />);

    expect(screen.getByText("账号已停用，云同步已阻断。")).toBeVisible();
    expect(screen.queryByText("Cloud sync is blocked for disabled accounts.")).not.toBeInTheDocument();
  });
});
