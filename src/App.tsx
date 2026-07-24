import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { SummaryHeader } from "./components/summary/SummaryHeader";
import type { DashboardView } from "./domain/navigation";
import type { DailyRecord } from "./domain/types";
import { calculateDailyCompletion, calculateStreak } from "./domain/progress";
import { hashForView, viewFromHash } from "./domain/navigation";
import { useCurrentDateKey } from "./hooks/useCurrentDateKey";
import { useDashboardData } from "./hooks/useDashboardData";
import { I18nProvider } from "./i18n/I18nProvider";
import { CheckInPage } from "./pages/CheckInPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { RewardsPage } from "./pages/RewardsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TimerPage } from "./pages/TimerPage";
import { createLocalStorageRepository } from "./services/storage/appRepository";

const activeRecordXp = (records: DailyRecord[]) =>
  records
    .filter((record) => record.deletedAt === null)
    .reduce((total, record) => total + record.xpEarned, 0);

const calculateLevel = (xp: number) => Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1);

function DashboardApp() {
  const repository = useMemo(() => createLocalStorageRepository(), []);
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    viewFromHash(globalThis.location?.hash ?? "")
  );
  const currentDate = useCurrentDateKey();
  const {
    state,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord,
    addTimerSession,
    latestUnlockedAchievementId
  } = useDashboardData(repository, currentDate);
  const summary = calculateDailyCompletion(todayRecord, state.dailyGoals);
  const streakDays = calculateStreak(state.records, currentDate);
  const xp = activeRecordXp(state.records);
  const level = calculateLevel(xp);

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

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);

    if (globalThis.location.hash !== hashForView(view)) {
      globalThis.history.pushState(null, "", hashForView(view));
    }
  };

  return (
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
