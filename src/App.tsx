import { useMemo } from "react";
import { AppShell } from "./components/layout/AppShell";
import { DailyCheckIn } from "./components/checkin/DailyCheckIn";
import { SummaryHeader } from "./components/summary/SummaryHeader";
import { TargetDashboard } from "./components/targets/TargetDashboard";
import { StudyTimerPanel } from "./components/timer/StudyTimerPanel";
import { Heatmap60 } from "./components/history/Heatmap60";
import { RewardsPanel } from "./components/rewards/RewardsPanel";
import type { DailyRecord } from "./domain/types";
import { calculateDailyCompletion, calculateStreak } from "./domain/progress";
import { useCurrentDateKey } from "./hooks/useCurrentDateKey";
import { useDashboardData } from "./hooks/useDashboardData";
import { I18nProvider } from "./i18n/I18nProvider";
import { createLocalStorageRepository } from "./services/storage/appRepository";

const activeRecordXp = (records: DailyRecord[]) =>
  records
    .filter((record) => record.deletedAt === null)
    .reduce((total, record) => total + record.xpEarned, 0);

const calculateLevel = (xp: number) => Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1);

function DashboardApp() {
  const repository = useMemo(() => createLocalStorageRepository(), []);
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

  return (
    <AppShell
      sidebar={
        <RewardsPanel
          achievements={state.achievements}
          latestUnlockedAchievementId={latestUnlockedAchievementId}
          level={level}
          xp={xp}
        />
      }
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
      <div className="grid min-w-0 gap-4">
        <DailyCheckIn
          dailyGoals={state.dailyGoals}
          todayRecord={todayRecord}
          updateTodayRecord={updateTodayRecord}
        />
        <StudyTimerPanel
          addTimerSession={addTimerSession}
          dailyGoals={state.dailyGoals}
          today={currentDate}
          userId={state.profile.userId}
        />
        <Heatmap60 records={state.records} today={currentDate} />
        <TargetDashboard
          dailyGoals={state.dailyGoals}
          profile={state.profile}
          updateDailyGoals={updateDailyGoals}
          updateProfile={updateProfile}
        />
      </div>
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
