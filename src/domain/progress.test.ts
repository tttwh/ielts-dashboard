import { describe, expect, it } from "vitest";
import {
  buildHeatmapDays,
  calculateDailyCompletion,
  calculateStreak,
  calculateXp
} from "./progress";
import type { DailyGoals, DailyRecord } from "./types";

const goals: DailyGoals = {
  wordsTarget: 100,
  speakingTopicsTarget: 3,
  listeningTestsTarget: 1,
  corpusMinutesTarget: 30,
  sectionMinutesTarget: {
    listening: 45,
    speaking: 30,
    reading: 60,
    writing: 45
  }
};

const baseRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-22",
  words: 100,
  speakingTopics: 3,
  listeningTests: 1,
  corpusMinutes: 30,
  sectionMinutes: {
    listening: 45,
    speaking: 30,
    reading: 60,
    writing: 45
  },
  readingOvertimeMinutes: 0,
  completionRate: 0,
  isAllClear: false,
  xpEarned: 0,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
};

describe("calculateDailyCompletion", () => {
  it("marks all clear when every enabled target reaches 100 percent", () => {
    const summary = calculateDailyCompletion(baseRecord, goals);
    expect(summary.completionRate).toBe(1);
    expect(summary.isAllClear).toBe(true);
    expect(summary.isBalancedDay).toBe(true);
  });

  it("caps each individual goal at 100 percent before averaging", () => {
    const summary = calculateDailyCompletion(
      { ...baseRecord, words: 1000, speakingTopics: 30 },
      goals
    );
    expect(summary.completionRate).toBe(1);
  });

  it("excludes zero-valued targets from the average", () => {
    const summary = calculateDailyCompletion(baseRecord, {
      ...goals,
      wordsTarget: 0,
      corpusMinutesTarget: 0
    });
    expect(summary.enabledGoalCount).toBe(6);
    expect(summary.completionRate).toBe(1);
  });
});

describe("calculateXp", () => {
  it("adds all clear and balanced day bonuses", () => {
    expect(calculateXp(1, true, true)).toBe(130);
  });
});

describe("calculateStreak", () => {
  it("counts consecutive study days ending today", () => {
    const records: DailyRecord[] = [
      { ...baseRecord, recordId: "record-1", date: "2026-07-20", completionRate: 0.4 },
      { ...baseRecord, recordId: "record-2", date: "2026-07-21", completionRate: 0.8 },
      { ...baseRecord, recordId: "record-3", date: "2026-07-22", completionRate: 1 },
      { ...baseRecord, recordId: "record-4", date: "2026-07-18", completionRate: 1 }
    ];

    expect(calculateStreak(records, "2026-07-22")).toBe(3);
  });
});

describe("buildHeatmapDays", () => {
  it("includes today and sorts oldest to newest", () => {
    expect(buildHeatmapDays([baseRecord], "2026-07-22", 3)).toEqual([
      {
        date: "2026-07-20",
        completionRate: 0,
        isAllClear: false,
        level: 0
      },
      {
        date: "2026-07-21",
        completionRate: 0,
        isAllClear: false,
        level: 0
      },
      {
        date: "2026-07-22",
        completionRate: 0,
        isAllClear: false,
        level: 0
      }
    ]);
  });
});
