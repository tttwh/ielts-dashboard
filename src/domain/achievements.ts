import { calculateStreak } from "./progress";
import type { Achievement, DailyRecord, TimerSession } from "./types";

type AchievementRule = (input: RuleInput) => boolean;

interface RuleInput {
  records: DailyRecord[];
  timerSessions: TimerSession[];
  today: string;
}

interface AchievementDefinition {
  achievementId: string;
  name: string;
  description: string;
  category: Achievement["category"];
  legacyAchievementIds?: string[];
  rule: AchievementRule;
}

export interface AchievementEvaluationInput {
  records: DailyRecord[];
  timerSessions: TimerSession[];
  achievements: Achievement[];
  now?: string;
  today?: string;
  userId?: string;
}

const hasAnySectionMinutes = (record: DailyRecord) =>
  Object.values(record.sectionMinutes).some((minutes) => minutes > 0);

const hasStudyProgress = (record: DailyRecord) =>
  record.completionRate > 0 ||
  record.isAllClear ||
  record.words > 0 ||
  record.speakingTopics > 0 ||
  record.listeningTests > 0 ||
  record.corpusMinutes > 0 ||
  hasAnySectionMinutes(record);

const hasBalancedSectionMinutes = (record: DailyRecord) =>
  Object.values(record.sectionMinutes).every((minutes) => minutes > 0);

const studyDates = (records: DailyRecord[], timerSessions: TimerSession[]) => {
  const dates = new Set<string>();

  records.forEach((record) => {
    if (hasStudyProgress(record)) {
      dates.add(record.date);
    }
  });
  timerSessions.forEach((session) => {
    if (session.actualMinutes > 0) {
      dates.add(session.date);
    }
  });

  return dates;
};

const latestRecordDate = (records: DailyRecord[]) =>
  records.reduce<string | null>((latestDate, record) => {
    if (!hasStudyProgress(record)) return latestDate;
    return latestDate === null || record.date > latestDate ? record.date : latestDate;
  }, null);

const definitions: readonly AchievementDefinition[] = [
  {
    achievementId: "first-check-in",
    name: "First Check-in",
    description: "Record any daily completion progress above 0.",
    category: "milestone",
    rule: ({ records }) => records.some((record) => record.completionRate > 0)
  },
  {
    achievementId: "all-clear",
    name: "All Clear",
    description: "Complete every enabled daily target once.",
    category: "milestone",
    legacyAchievementIds: ["first-all-clear"],
    rule: ({ records }) => records.some((record) => record.isAllClear)
  },
  {
    achievementId: "seven-day-streak",
    name: "7-Day Streak",
    description: "Record study progress for seven consecutive days.",
    category: "streak",
    rule: ({ records, today }) => calculateStreak(records, today) >= 7
  },
  {
    achievementId: "fourteen-day-streak",
    name: "14-Day Streak",
    description: "Record study progress for fourteen consecutive days.",
    category: "streak",
    rule: ({ records, today }) => calculateStreak(records, today) >= 14
  },
  {
    achievementId: "reading-discipline",
    name: "Reading Discipline",
    description: "Record focused reading practice.",
    category: "skill",
    rule: ({ records }) => records.some((record) => record.sectionMinutes.reading > 0)
  },
  {
    achievementId: "listening-builder",
    name: "Listening Builder",
    description: "Record listening practice or a listening test.",
    category: "skill",
    rule: ({ records }) =>
      records.some((record) => record.sectionMinutes.listening > 0 || record.listeningTests > 0)
  },
  {
    achievementId: "speaking-starter",
    name: "Speaking Starter",
    description: "Record speaking practice or a speaking topic.",
    category: "skill",
    rule: ({ records }) =>
      records.some((record) => record.sectionMinutes.speaking > 0 || record.speakingTopics > 0)
  },
  {
    achievementId: "writing-keeper",
    name: "Writing Keeper",
    description: "Record focused writing practice.",
    category: "skill",
    rule: ({ records }) => records.some((record) => record.sectionMinutes.writing > 0)
  },
  {
    achievementId: "balanced-day",
    name: "Balanced Day",
    description: "Study all four IELTS sections in one day.",
    category: "balance",
    rule: ({ records }) => records.some(hasBalancedSectionMinutes)
  },
  {
    achievementId: "sixty-day-witness",
    name: "60-Day Witness",
    description: "Build a visible history across sixty study days.",
    category: "streak",
    rule: ({ records, timerSessions }) => studyDates(records, timerSessions).size >= 60
  }
];

const activeRecords = (records: DailyRecord[]) =>
  records.filter((record) => record.deletedAt === null);

const activeTimerSessions = (timerSessions: TimerSession[]) =>
  timerSessions.filter((session) => session.deletedAt === null);

const findPersistedAchievement = (
  achievements: Achievement[],
  definition: AchievementDefinition
) => {
  const achievementIds = [
    definition.achievementId,
    ...(definition.legacyAchievementIds ?? [])
  ];

  return achievements.find((achievement) => achievementIds.includes(achievement.achievementId));
};

export function createInitialAchievements(
  now: string = new Date().toISOString(),
  userId: string = "local-user"
): Achievement[] {
  return definitions.map(({ achievementId, name, description, category }) => ({
    achievementId,
    userId,
    name,
    description,
    category,
    unlockedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local-only"
  }));
}

export function evaluateAchievements({
  records,
  timerSessions,
  achievements,
  now = new Date().toISOString(),
  today,
  userId
}: AchievementEvaluationInput): Achievement[] {
  const recordsForRules = activeRecords(records);
  const timerSessionsForRules = activeTimerSessions(timerSessions);
  const ruleInput = {
    records: recordsForRules,
    timerSessions: timerSessionsForRules,
    today: today ?? latestRecordDate(recordsForRules) ?? ""
  };
  const fallbackUserId =
    userId ?? achievements[0]?.userId ?? recordsForRules[0]?.userId ?? "local-user";

  return definitions.map(({ rule, legacyAchievementIds: _legacyIds, ...definition }) => {
    const persisted = findPersistedAchievement(achievements, {
      ...definition,
      legacyAchievementIds: _legacyIds,
      rule
    });
    const unlockedAt = persisted?.unlockedAt ?? (rule(ruleInput) ? now : null);
    const wasNewlyUnlocked = !persisted?.unlockedAt && unlockedAt !== null;

    return {
      ...definition,
      userId: persisted?.userId ?? fallbackUserId,
      unlockedAt,
      createdAt: persisted?.createdAt ?? now,
      updatedAt: wasNewlyUnlocked ? now : (persisted?.updatedAt ?? now),
      deletedAt: null,
      syncStatus: wasNewlyUnlocked ? "local-only" : (persisted?.syncStatus ?? "local-only")
    };
  });
}
