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
      <PageHeader
        description={t.navigation.viewDescription("timer")}
        title={t.navigation.viewLabel("timer")}
      />
      <StudyTimerPanel {...props} />
    </div>
  );
}
