import type { DailyGoals, UserProfile } from "../../domain/types";
import { IELTS_SECTIONS } from "../../domain/defaults";
import type { DailyGoalsUpdate, ProfileUpdate } from "../../hooks/useDashboardData";
import { useI18n } from "../../i18n/I18nProvider";
import { NumberField } from "../ui/NumberField";

interface TargetDashboardProps {
  profile: UserProfile;
  dailyGoals: DailyGoals;
  updateProfile(update: ProfileUpdate): void;
  updateDailyGoals(update: DailyGoalsUpdate): void;
}

export function TargetDashboard({
  profile,
  dailyGoals,
  updateProfile,
  updateDailyGoals
}: TargetDashboardProps) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t.targets.regionLabel}
      className="min-w-0 rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="target-dashboard"
    >
      <div className="flex min-w-0 flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-ink">{t.targets.title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{t.targets.description}</p>
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-normal text-ielts-purple">
          {t.targets.localAutoSave}
        </p>
      </div>

      <div className="grid min-w-0 gap-5 p-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-ink">{t.targets.scoreTargets}</legend>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label={t.targets.totalBand}
              max={9}
              min={0}
              onChange={(targetBand) => updateProfile({ targetBand })}
              step={0.5}
              suffix={t.units.band}
              value={profile.targetBand}
            />
            {IELTS_SECTIONS.map((section) => (
              <NumberField
                key={section}
                label={t.targets.sectionBand(t.sections[section])}
                max={9}
                min={0}
                onChange={(target) => updateProfile({ sectionTargets: { [section]: target } })}
                step={0.5}
                suffix={t.units.band}
                value={profile.sectionTargets[section]}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-ink">{t.targets.dailyGoals}</legend>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3">
            <NumberField
              label={t.checkIn.taskLabels.words}
              max={999}
              min={0}
              onChange={(wordsTarget) => updateDailyGoals({ wordsTarget })}
              step={10}
              suffix={t.units.words}
              value={dailyGoals.wordsTarget}
            />
            <NumberField
              label={t.checkIn.taskLabels.speakingTopics}
              max={99}
              min={0}
              onChange={(speakingTopicsTarget) => updateDailyGoals({ speakingTopicsTarget })}
              step={1}
              suffix={t.units.topics}
              value={dailyGoals.speakingTopicsTarget}
            />
            <NumberField
              label={t.checkIn.taskLabels.listeningTests}
              max={10}
              min={0}
              onChange={(listeningTestsTarget) => updateDailyGoals({ listeningTestsTarget })}
              step={1}
              suffix={t.units.tests}
              value={dailyGoals.listeningTestsTarget}
            />
            <NumberField
              label={t.checkIn.taskLabels.corpusMinutes}
              max={600}
              min={0}
              onChange={(corpusMinutesTarget) => updateDailyGoals({ corpusMinutesTarget })}
              step={5}
              suffix={t.units.minutesShort}
              value={dailyGoals.corpusMinutesTarget}
            />
            {IELTS_SECTIONS.map((section) => (
              <NumberField
                key={section}
                label={t.targets.sectionMinutes(t.sections[section])}
                max={600}
                min={0}
                onChange={(minutes) =>
                  updateDailyGoals({ sectionMinutesTarget: { [section]: minutes } })
                }
                step={5}
                suffix={t.units.minutesShort}
                value={dailyGoals.sectionMinutesTarget[section]}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
