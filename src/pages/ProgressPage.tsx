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
      <PageHeader
        description={t.navigation.viewDescription("progress")}
        title={t.navigation.viewLabel("progress")}
      />
      <Heatmap60 records={records} today={today} />
    </div>
  );
}
