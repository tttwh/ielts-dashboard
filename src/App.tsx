import { AppShell } from "./components/layout/AppShell";
import { DailyCheckIn } from "./components/checkin/DailyCheckIn";
import { SummaryHeader } from "./components/summary/SummaryHeader";
import { TargetDashboard } from "./components/targets/TargetDashboard";
import { StudyTimerPanel } from "./components/timer/StudyTimerPanel";
import { Heatmap60 } from "./components/history/Heatmap60";
import type { DailyRecord } from "./domain/types";
import { calculateDailyCompletion, calculateStreak } from "./domain/progress";
import { useDashboardData } from "./hooks/useDashboardData";

const activeRecordXp = (records: DailyRecord[]) =>
  records
    .filter((record) => record.deletedAt === null)
    .reduce((total, record) => total + record.xpEarned, 0);

const calculateLevel = (xp: number) => Math.max(1, Math.floor(Math.max(0, xp) / 100) + 1);

export default function App() {
  const {
    state,
    todayRecord,
    updateDailyGoals,
    updateProfile,
    updateTodayRecord,
    addTimerSession
  } = useDashboardData();
  const summary = calculateDailyCompletion(todayRecord, state.dailyGoals);
  const streakDays = calculateStreak(state.records, todayRecord.date);
  const xp = activeRecordXp(state.records);
  const level = calculateLevel(xp);

  return (
    <AppShell
      sidebar={
        <section className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Compact Rail</h2>
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="h-3 w-3/4 rounded-[4px] bg-soft-line" />
            <div className="h-3 w-1/2 rounded-[4px] bg-soft-line" />
            <div className="h-12 rounded-[6px] bg-surface" />
          </div>
        </section>
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
          today={todayRecord.date}
          userId={state.profile.userId}
        />
        <Heatmap60 records={state.records} today={todayRecord.date} />
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
