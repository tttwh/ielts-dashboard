import { PageHeader } from "../components/layout/PageHeader";
import { RewardsPanel } from "../components/rewards/RewardsPanel";
import type { Achievement } from "../domain/types";
import { useI18n } from "../i18n/I18nProvider";

interface RewardsPageProps {
  achievements: Achievement[];
  latestUnlockedAchievementId?: string | null;
  level: number;
  xp: number;
}

export function RewardsPage(props: RewardsPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader
        description={t.navigation.viewDescription("rewards")}
        title={t.navigation.viewLabel("rewards")}
      />
      <RewardsPanel {...props} />
    </div>
  );
}
