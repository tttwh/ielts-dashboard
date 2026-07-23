import { Award, LockKeyhole, Sparkles } from "lucide-react";
import type { Achievement } from "../../domain/types";
import { useI18n } from "../../i18n/I18nProvider";

interface RewardsPanelProps {
  achievements: Achievement[];
  xp: number;
  level: number;
  latestUnlockedAchievementId?: string | null;
}

interface AchievementChipProps {
  achievement: Achievement;
  description: string;
  displayName: string;
  isLatest: boolean;
  isUnlocked: boolean;
}

const xpPerLevel = 100;

const newestUnlockedAchievement = (achievements: Achievement[]) =>
  achievements.reduce<Achievement | null>((latest, achievement) => {
    if (!achievement.unlockedAt) return latest;
    if (!latest?.unlockedAt) return achievement;
    return achievement.unlockedAt >= latest.unlockedAt ? achievement : latest;
  }, null);

function AchievementChip({
  achievement,
  description,
  displayName,
  isLatest,
  isUnlocked
}: AchievementChipProps) {
  const Icon = isUnlocked ? Award : LockKeyhole;
  const unlockedClasses = isLatest
    ? "border-purple-300 bg-purple-50 text-ielts-purple reward-badge--pulse"
    : "border-blue-200 bg-blue-50 text-ielts-blue";
  const lockedClasses = "border-line bg-surface text-muted opacity-70";

  return (
    <span
      aria-disabled={isUnlocked ? undefined : "true"}
      className={`inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold leading-5 ${
        isUnlocked ? unlockedClasses : lockedClasses
      }`}
      data-testid={`achievement-${achievement.achievementId}`}
      title={description}
    >
      <Icon aria-hidden="true" className="shrink-0" size={13} strokeWidth={2.5} />
      <span className="min-w-0 break-words">{displayName}</span>
    </span>
  );
}

export function RewardsPanel({
  achievements,
  xp,
  level,
  latestUnlockedAchievementId
}: RewardsPanelProps) {
  const { t } = useI18n();
  const safeXp = Math.max(0, xp);
  const levelBaseXp = Math.max(0, level - 1) * xpPerLevel;
  const currentLevelXp = Math.min(Math.max(safeXp - levelBaseXp, 0), xpPerLevel);
  const progressPercent = (currentLevelXp / xpPerLevel) * 100;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlockedAt);
  const lockedAchievements = achievements.filter((achievement) => !achievement.unlockedAt);
  const latestUnlock =
    achievements.find((achievement) => achievement.achievementId === latestUnlockedAchievementId) ??
    newestUnlockedAchievement(achievements);

  return (
    <section
      aria-labelledby="rewards-heading"
      className="min-w-0 rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="rewards-panel"
    >
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0">
          <h2 id="rewards-heading" className="text-base font-semibold leading-6 text-ink">
            {t.rewards.title}
          </h2>
          <p className="mt-1 font-mono text-sm font-semibold text-ielts-purple">
            {t.rewards.levelValue(level)}
          </p>
        </div>
        <div className="shrink-0 rounded-[6px] border border-blue-100 bg-blue-50 px-2.5 py-1 text-right">
          <p className="font-mono text-xs font-semibold text-ielts-blue">
            {currentLevelXp}/{xpPerLevel} {t.units.xp}
          </p>
        </div>
      </div>

      <div className="min-w-0 p-4">
        <div
          aria-label={t.rewards.xpProgressLabel}
          aria-valuemax={xpPerLevel}
          aria-valuemin={0}
          aria-valuenow={currentLevelXp}
          className="h-2 overflow-hidden rounded-full bg-soft-line"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-ielts-blue to-ielts-purple"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          aria-live="polite"
          className="mt-3 flex min-w-0 items-center gap-2 rounded-[6px] border border-purple-100 bg-purple-50 px-3 py-2"
        >
          <Sparkles aria-hidden="true" className="shrink-0 text-ielts-purple" size={15} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">
              {t.rewards.latestUnlock}
            </p>
            <p className="truncate text-sm font-semibold text-ink">
              {latestUnlock
                ? t.rewards.achievementName(latestUnlock.achievementId, latestUnlock.name)
                : t.rewards.noUnlocksYet}
            </p>
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted">
            {t.rewards.unlocked}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2" data-testid="unlocked-achievements">
            {unlockedAchievements.length > 0 ? (
              unlockedAchievements.map((achievement) => (
                <AchievementChip
                  achievement={achievement}
                  description={t.rewards.achievementDescription(
                    achievement.achievementId,
                    achievement.description
                  )}
                  displayName={t.rewards.achievementName(
                    achievement.achievementId,
                    achievement.name
                  )}
                  isLatest={achievement.achievementId === latestUnlock?.achievementId}
                  isUnlocked
                  key={achievement.achievementId}
                />
              ))
            ) : (
              <span className="text-sm text-muted">{t.rewards.noUnlocksYet}</span>
            )}
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted">
            {t.rewards.locked}
          </p>
          <div className="mt-2 flex min-w-0 flex-wrap gap-2" data-testid="locked-achievements">
            {lockedAchievements.map((achievement) => (
              <AchievementChip
                achievement={achievement}
                description={t.rewards.achievementDescription(
                  achievement.achievementId,
                  achievement.description
                )}
                displayName={t.rewards.achievementName(
                  achievement.achievementId,
                  achievement.name
                )}
                isLatest={false}
                isUnlocked={false}
                key={achievement.achievementId}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
