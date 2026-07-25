import { AlertCircle, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "./components/auth/AuthPanel";
import { AppShell } from "./components/layout/AppShell";
import { SummaryHeader } from "./components/summary/SummaryHeader";
import type { DashboardView } from "./domain/navigation";
import type { DailyRecord } from "./domain/types";
import { calculateDailyCompletion, calculateStreak } from "./domain/progress";
import { hashForView, viewFromHash } from "./domain/navigation";
import { useAuthSession } from "./hooks/useAuthSession";
import { useCurrentDateKey } from "./hooks/useCurrentDateKey";
import { useDashboardData } from "./hooks/useDashboardData";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { CheckInPage } from "./pages/CheckInPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { RewardsPage } from "./pages/RewardsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimerPage } from "./pages/TimerPage";
import { createAuthService, type AuthService } from "./services/cloudbase/authService";
import {
  createCloudBaseClient,
  readCloudBaseConfig
} from "./services/cloudbase/cloudbaseClient";
import { createCloudRepository } from "./services/cloudbase/cloudRepository";
import { createLocalStorageRepository } from "./services/storage/appRepository";
import { createSyncManager, type SyncManager } from "./services/sync/syncManager";
import type { SyncState } from "./services/sync/syncTypes";

const activeRecordXp = (records: DailyRecord[]) =>
  records
    .filter((record) => record.deletedAt === null)
    .reduce((total, record) => total + record.xpEarned, 0);

const calculateLevel = (xp: number) => Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1);

interface CloudRuntime {
  authService: AuthService;
  syncManager: SyncManager;
}

const createGuestAuthService = (unavailableMessage: string): AuthService => ({
  async getCurrentUser() {
    return null;
  },

  async startEmailSignUp() {
    throw new Error(unavailableMessage);
  },

  async completeEmailSignUp() {
    throw new Error(unavailableMessage);
  },

  async signIn() {
    throw new Error(unavailableMessage);
  },

  async signOut() {
    return undefined;
  },

  onAuthStateChanged(listener) {
    listener(null);
    return () => undefined;
  }
});

const createCloudRuntime = (): CloudRuntime | null => {
  let config;
  try {
    config = readCloudBaseConfig();
  } catch {
    return null;
  }

  const client = createCloudBaseClient(config);
  const repository = createCloudRepository(client.rdb());

  return {
    authService: createAuthService(client.auth),
    syncManager: createSyncManager(repository)
  };
};

const accountNameForUser = (
  user: { accountName: string | null; email: string | null; username: string | null } | null
) => user?.accountName ?? user?.username ?? user?.email ?? null;

const syncLabel = (t: ReturnType<typeof useI18n>["t"], syncState: SyncState) => {
  switch (syncState.mode) {
    case "syncing":
      return t.sync.syncing;
    case "synced":
      return t.sync.synced;
    case "offline":
      return t.sync.offline;
    case "error":
      return t.sync.error;
    case "guest":
    default:
      return t.sync.guest;
  }
};

function SyncStatusBadge({
  cloudbaseConfigured,
  syncState
}: {
  cloudbaseConfigured: boolean;
  syncState: SyncState;
}) {
  const { t } = useI18n();
  const label = syncLabel(t, syncState);
  const Icon =
    syncState.mode === "error"
      ? AlertCircle
      : syncState.mode === "syncing"
        ? RefreshCw
        : cloudbaseConfigured
          ? Cloud
          : CloudOff;

  return (
    <section
      aria-live="polite"
      className="glass-panel flex min-w-0 items-center justify-between gap-3 p-3"
      data-testid="sync-status"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-blue-100 bg-blue-50 text-ielts-blue">
          <Icon aria-hidden="true" size={16} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="break-words font-mono text-sm font-semibold text-ink">{label}</p>
          {syncState.message ? (
            <p className="mt-0.5 break-words text-xs font-medium text-muted">
              {syncState.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DashboardApp() {
  const { t } = useI18n();
  const cloudRuntime = useMemo(() => createCloudRuntime(), []);
  const guestAuthService = useMemo(
    () => createGuestAuthService(t.auth.cloudUnavailable),
    [t.auth.cloudUnavailable]
  );
  const repository = useMemo(() => createLocalStorageRepository(), []);
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    viewFromHash(globalThis.location?.hash ?? "")
  );
  const currentDate = useCurrentDateKey();
  const authSession = useAuthSession(cloudRuntime?.authService ?? guestAuthService);
  const lastAuthSyncKeyRef = useRef<string | null>(null);
  const {
    addTimerSession,
    enterGuestMode,
    latestUnlockedAchievementId,
    state,
    syncNow,
    syncState,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord
  } = useDashboardData(repository, currentDate, cloudRuntime?.syncManager);
  const summary = calculateDailyCompletion(todayRecord, state.dailyGoals);
  const streakDays = calculateStreak(state.records, currentDate);
  const xp = activeRecordXp(state.records);
  const level = calculateLevel(xp);
  const accountName = accountNameForUser(authSession.user);

  useEffect(() => {
    const handleLocationChange = () => {
      setActiveView(viewFromHash(globalThis.location.hash));
    };

    globalThis.addEventListener("hashchange", handleLocationChange);
    globalThis.addEventListener("popstate", handleLocationChange);

    return () => {
      globalThis.removeEventListener("hashchange", handleLocationChange);
      globalThis.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (authSession.status !== "authenticated" || !authSession.user) {
      lastAuthSyncKeyRef.current = null;
      if (authSession.status !== "loading") {
        enterGuestMode();
      }
      return;
    }

    const syncKey = `${authSession.user.uid}\u0000${accountName ?? ""}`;
    if (lastAuthSyncKeyRef.current === syncKey) {
      if (syncState.mode === "offline") {
        void syncNow(authSession.user.uid, accountName);
      }
      return;
    }

    lastAuthSyncKeyRef.current = syncKey;
    void syncNow(authSession.user.uid, accountName);
  }, [accountName, authSession.status, authSession.user, enterGuestMode, syncNow, syncState.mode]);

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);

    if (globalThis.location.hash !== hashForView(view)) {
      globalThis.history.pushState(null, "", hashForView(view));
    }
  };

  return (
    <AppShell
      activeView={activeView}
      authSlot={
        <AuthPanel
          accountName={accountName}
          errorMessage={authSession.errorMessage}
          onCompleteEmailSignUp={authSession.completeEmailSignUp}
          onSignIn={authSession.signIn}
          onSignOut={authSession.signOut}
          onStartEmailSignUp={authSession.startEmailSignUp}
          pendingSignUpEmail={authSession.pendingSignUp?.email ?? null}
          status={authSession.status}
        />
      }
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
      syncStatusSlot={
        <SyncStatusBadge
          cloudbaseConfigured={cloudRuntime !== null}
          syncState={syncState}
        />
      }
    >
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
          cloudbaseConfigured={cloudRuntime !== null}
          dailyGoals={state.dailyGoals}
          profile={state.profile}
          syncState={syncState}
          updateDailyGoals={updateDailyGoals}
          updateProfile={updateProfile}
        />
      ) : null}
    </AppShell>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <DashboardApp />
    </I18nProvider>
  );
}
