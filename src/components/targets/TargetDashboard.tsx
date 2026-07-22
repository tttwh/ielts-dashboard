import type { DailyGoals, UserProfile } from "../../domain/types";
import { IELTS_SECTIONS, SECTION_LABELS } from "../../domain/defaults";
import type { DailyGoalsUpdate, ProfileUpdate } from "../../hooks/useDashboardData";
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
  return (
    <section
      aria-label="Target dashboard"
      className="min-w-0 rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="target-dashboard"
    >
      <div className="flex min-w-0 flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-ink">Target Dashboard</h2>
          <p className="mt-1 text-sm leading-5 text-muted">Band targets and daily practice load.</p>
        </div>
        <p className="font-mono text-xs font-semibold uppercase tracking-normal text-ielts-purple">
          Local auto-save
        </p>
      </div>

      <div className="grid min-w-0 gap-5 p-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-ink">Score Targets</legend>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField
              label="Total band"
              max={9}
              min={0}
              onChange={(targetBand) => updateProfile({ targetBand })}
              step={0.5}
              suffix="band"
              value={profile.targetBand}
            />
            {IELTS_SECTIONS.map((section) => (
              <NumberField
                key={section}
                label={`${SECTION_LABELS[section]} band`}
                max={9}
                min={0}
                onChange={(target) => updateProfile({ sectionTargets: { [section]: target } })}
                step={0.5}
                suffix="band"
                value={profile.sectionTargets[section]}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-ink">Daily Goals</legend>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3">
            <NumberField
              label="Words"
              max={999}
              min={0}
              onChange={(wordsTarget) => updateDailyGoals({ wordsTarget })}
              step={10}
              suffix="words"
              value={dailyGoals.wordsTarget}
            />
            <NumberField
              label="Speaking topics"
              max={99}
              min={0}
              onChange={(speakingTopicsTarget) => updateDailyGoals({ speakingTopicsTarget })}
              step={1}
              suffix="topics"
              value={dailyGoals.speakingTopicsTarget}
            />
            <NumberField
              label="Listening tests"
              max={10}
              min={0}
              onChange={(listeningTestsTarget) => updateDailyGoals({ listeningTestsTarget })}
              step={1}
              suffix="tests"
              value={dailyGoals.listeningTestsTarget}
            />
            <NumberField
              label="Corpus minutes"
              max={600}
              min={0}
              onChange={(corpusMinutesTarget) => updateDailyGoals({ corpusMinutesTarget })}
              step={5}
              suffix="min"
              value={dailyGoals.corpusMinutesTarget}
            />
            {IELTS_SECTIONS.map((section) => (
              <NumberField
                key={section}
                label={`${SECTION_LABELS[section]} minutes`}
                max={600}
                min={0}
                onChange={(minutes) =>
                  updateDailyGoals({ sectionMinutesTarget: { [section]: minutes } })
                }
                step={5}
                suffix="min"
                value={dailyGoals.sectionMinutesTarget[section]}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
