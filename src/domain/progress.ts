import { addDays, lastNDays } from "../lib/date";
import type { CompletionSummary, DailyGoals, DailyRecord, HeatmapDay } from "./types";

const clampProgress = (actual: number, target: number) => {
  if (target <= 0) return null;
  return Math.min(Math.max(actual, 0) / target, 1);
};

const clampRate = (rate: number) => Math.min(Math.max(rate, 0), 1);

const hasAnySectionMinutes = (record: DailyRecord) =>
  Object.values(record.sectionMinutes).some((minutes) => minutes > 0);

export const hasDailyStudyActivity = (record: DailyRecord) =>
  record.deletedAt === null &&
  (record.completionRate > 0 ||
    record.isAllClear ||
    record.words > 0 ||
    record.speakingTopics > 0 ||
    record.listeningTests > 0 ||
    record.corpusMinutes > 0 ||
    hasAnySectionMinutes(record));

export function calculateDailyCompletion(record: DailyRecord, goals: DailyGoals): CompletionSummary {
  const progressEntries: Array<[string, number | null]> = [
    ["words", clampProgress(record.words, goals.wordsTarget)],
    ["speakingTopics", clampProgress(record.speakingTopics, goals.speakingTopicsTarget)],
    ["listeningTests", clampProgress(record.listeningTests, goals.listeningTestsTarget)],
    ["corpusMinutes", clampProgress(record.corpusMinutes, goals.corpusMinutesTarget)],
    [
      "listeningMinutes",
      clampProgress(record.sectionMinutes.listening, goals.sectionMinutesTarget.listening)
    ],
    [
      "speakingMinutes",
      clampProgress(record.sectionMinutes.speaking, goals.sectionMinutesTarget.speaking)
    ],
    ["readingMinutes", clampProgress(record.sectionMinutes.reading, goals.sectionMinutesTarget.reading)],
    ["writingMinutes", clampProgress(record.sectionMinutes.writing, goals.sectionMinutesTarget.writing)]
  ];

  const enabledEntries = progressEntries.filter((entry): entry is [string, number] => entry[1] !== null);
  const completionRate =
    enabledEntries.length === 0
      ? 0
      : enabledEntries.reduce((sum, [, value]) => sum + value, 0) / enabledEntries.length;

  const itemProgress = Object.fromEntries(enabledEntries);
  const isBalancedDay = Object.values(record.sectionMinutes).every((minutes) => minutes > 0);

  return {
    completionRate,
    isAllClear: enabledEntries.length > 0 && enabledEntries.every(([, value]) => value >= 1),
    isBalancedDay,
    enabledGoalCount: enabledEntries.length,
    itemProgress
  };
}

export function createEmptyDailyRecord(date: string, userId: string, now: string): DailyRecord {
  return {
    recordId: `record-${date}`,
    userId,
    date,
    words: 0,
    speakingTopics: 0,
    listeningTests: 0,
    corpusMinutes: 0,
    sectionMinutes: {
      listening: 0,
      speaking: 0,
      reading: 0,
      writing: 0
    },
    readingOvertimeMinutes: 0,
    completionRate: 0,
    isAllClear: false,
    xpEarned: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local-only"
  };
}

export function recalculateDailyRecordProgress(record: DailyRecord, goals: DailyGoals): DailyRecord {
  const summary = calculateDailyCompletion(record, goals);

  return {
    ...record,
    completionRate: summary.completionRate,
    isAllClear: summary.isAllClear,
    xpEarned: calculateXp(summary.completionRate, summary.isAllClear, summary.isBalancedDay)
  };
}

export function calculateStreak(records: DailyRecord[], today: string): number {
  const studyDates = new Set(records.filter(hasDailyStudyActivity).map((record) => record.date));
  let streak = 0;
  let cursor = today;

  while (studyDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function calculateLongestStreak(records: DailyRecord[]): number {
  const studyDates = [...new Set(records.filter(hasDailyStudyActivity).map((record) => record.date))].sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: string | null = null;

  for (const date of studyDates) {
    currentStreak = previousDate && date === addDays(previousDate, 1) ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDate = date;
  }

  return longestStreak;
}

export function buildHeatmapDays(records: DailyRecord[], today: string, days: number): HeatmapDay[] {
  const recordsByDate = new Map<string, DailyRecord>();

  for (const record of records) {
    if (record.deletedAt !== null) continue;

    const current = recordsByDate.get(record.date);
    if (!current || clampRate(record.completionRate) >= clampRate(current.completionRate)) {
      recordsByDate.set(record.date, record);
    }
  }

  return lastNDays(today, days).map((date) => {
    const record = recordsByDate.get(date);
    const completionRate = record ? clampRate(record.completionRate) : 0;
    const isAllClear = record?.isAllClear ?? false;

    return {
      date,
      completionRate,
      isAllClear,
      level: heatmapLevel(completionRate)
    };
  });
}

export function calculateXp(completionRate: number, isAllClear: boolean, isBalancedDay: boolean): number {
  return Math.round(completionRate * 100) + (isAllClear ? 20 : 0) + (isBalancedDay ? 10 : 0);
}

export function heatmapLevel(completionRate: number): HeatmapDay["level"] {
  if (completionRate <= 0) return 0;
  if (completionRate < 0.4) return 1;
  if (completionRate < 0.7) return 2;
  if (completionRate < 1) return 3;
  return 4;
}
