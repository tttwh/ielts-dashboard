import { LanguageToggle } from "../components/language/LanguageToggle";
import { PageHeader } from "../components/layout/PageHeader";
import { TargetDashboard } from "../components/targets/TargetDashboard";
import type { DailyGoals, UserProfile } from "../domain/types";
import type { DailyGoalsUpdate, ProfileUpdate } from "../hooks/useDashboardData";
import { useI18n } from "../i18n/I18nProvider";
import type { SyncState } from "../services/sync/syncTypes";
import { syncLabel, syncMessage } from "../services/sync/syncDisplay";

interface SettingsPageProps {
  cloudbaseConfigured: boolean;
  dailyGoals: DailyGoals;
  profile: UserProfile;
  syncState: SyncState;
  updateDailyGoals(update: DailyGoalsUpdate): void;
  updateProfile(update: ProfileUpdate): void;
}

export function SettingsPage({
  cloudbaseConfigured,
  dailyGoals,
  profile,
  syncState,
  updateDailyGoals,
  updateProfile
}: SettingsPageProps) {
  const { t } = useI18n();
  const cloudbaseMode = cloudbaseConfigured ? t.sync.cloudbaseReady : t.sync.guest;
  const cloudbaseStatusCopy = cloudbaseConfigured
    ? t.settings.cloudConfigured
    : t.settings.cloudLocalOnly;
  const currentSyncLabel = syncLabel(t, syncState);
  const currentSyncMessage = syncMessage(t, syncState);

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
        <div className="mt-3 grid gap-2 text-xs font-semibold text-ink sm:grid-cols-2">
          <div className="min-w-0 rounded-[6px] border border-white/70 bg-white/55 px-2.5 py-2">
            <span className="block text-muted">{t.settings.cloudMode}</span>
            <span className="mt-1 block break-words font-mono text-ielts-blue">{cloudbaseMode}</span>
          </div>
          <div className="min-w-0 rounded-[6px] border border-white/70 bg-white/55 px-2.5 py-2">
            <span className="block text-muted">{t.settings.syncStatus}</span>
            <span className="mt-1 block break-words font-mono text-ielts-purple">
              {currentSyncLabel}
            </span>
          </div>
          <span className="min-w-0 break-words font-mono">{t.settings.localStateKey}</span>
          <span className="min-w-0 break-words font-mono">{t.settings.languageKey}</span>
          <span className="min-w-0 break-words text-ielts-purple sm:col-span-2">
            {cloudbaseStatusCopy}
          </span>
          {currentSyncMessage ? (
            <span className="min-w-0 break-words text-muted sm:col-span-2">
              {currentSyncMessage}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
