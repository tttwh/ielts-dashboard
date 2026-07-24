import { LanguageToggle } from "../components/language/LanguageToggle";
import { PageHeader } from "../components/layout/PageHeader";
import { TargetDashboard } from "../components/targets/TargetDashboard";
import type { DailyGoals, UserProfile } from "../domain/types";
import type { DailyGoalsUpdate, ProfileUpdate } from "../hooks/useDashboardData";
import { useI18n } from "../i18n/I18nProvider";

interface SettingsPageProps {
  dailyGoals: DailyGoals;
  profile: UserProfile;
  updateDailyGoals(update: DailyGoalsUpdate): void;
  updateProfile(update: ProfileUpdate): void;
}

export function SettingsPage({
  dailyGoals,
  profile,
  updateDailyGoals,
  updateProfile
}: SettingsPageProps) {
  const { t } = useI18n();

  return (
    <div className="page-stack">
      <PageHeader description={t.settings.description} title={t.settings.title} />
      <section className="glass-panel p-4" aria-labelledby="language-settings-heading">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 id="language-settings-heading" className="text-base font-semibold text-ink">
              {t.settings.languageTitle}
            </h3>
            <p className="mt-1 text-sm text-muted">{t.settings.languageDescription}</p>
          </div>
          <LanguageToggle />
        </div>
      </section>
      <TargetDashboard
        dailyGoals={dailyGoals}
        profile={profile}
        updateDailyGoals={updateDailyGoals}
        updateProfile={updateProfile}
      />
      <section className="glass-panel p-4" aria-labelledby="storage-settings-heading">
        <h3 id="storage-settings-heading" className="text-base font-semibold text-ink">
          {t.settings.storageTitle}
        </h3>
        <p className="mt-1 text-sm text-muted">{t.settings.storageDescription}</p>
        <div className="mt-3 grid gap-2 font-mono text-xs font-semibold text-ink">
          <span>{t.settings.localStateKey}</span>
          <span>{t.settings.languageKey}</span>
          <span className="text-ielts-purple">{t.settings.cloudReady}</span>
        </div>
      </section>
    </div>
  );
}
