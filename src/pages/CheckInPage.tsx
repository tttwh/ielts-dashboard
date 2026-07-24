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
      <PageHeader
        description={t.navigation.viewDescription("checkin")}
        title={t.navigation.viewLabel("checkin")}
      />
      <DailyCheckIn {...props} />
    </div>
  );
}
