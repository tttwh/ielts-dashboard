import { describe, expect, it } from "vitest";
import {
  buildHeatmapDays,
  calculateDailyCompletion,
  calculateLongestStreak,
  calculateStreak,
  calculateXp
} from "./progress";
import type { DailyGoals, DailyRecord } from "./types";

const goals: DailyGoals = {
  userId: "local-user",
  wordsTarget: 100,
  speakingTopicsTarget: 3,
  listeningTestsTarget: 1,
  corpusMinutesTarget: 30,
  sectionMinutesTarget: {
    listening: 45,
    speaking: 30,
    reading: 60,
    writing: 45
  },
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
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

  it("counts raw study activity even when completion fields are zero", () => {
    const inactiveRecord = {
      ...baseRecord,
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
      completionRate: 0,
      isAllClear: false,
      xpEarned: 0
    };
    const records: DailyRecord[] = [
      { ...inactiveRecord, recordId: "record-1", date: "2026-07-20", words: 20 },
      {
        ...inactiveRecord,
        recordId: "record-2",
        date: "2026-07-21",
        sectionMinutes: { ...inactiveRecord.sectionMinutes, reading: 15 }
      },
      { ...inactiveRecord, recordId: "record-3", date: "2026-07-22", corpusMinutes: 10 }
    ];

    expect(calculateStreak(records, "2026-07-22")).toBe(3);
  });

  it("returns the longest consecutive raw activity run across history", () => {
    const records: DailyRecord[] = [
      { ...baseRecord, recordId: "record-1", date: "2026-07-01", completionRate: 0.2 },
      { ...baseRecord, recordId: "record-2", date: "2026-07-02", completionRate: 0.2 },
      { ...baseRecord, recordId: "record-3", date: "2026-07-04", completionRate: 0.2 },
      { ...baseRecord, recordId: "record-4", date: "2026-07-05", completionRate: 0.2 },
      { ...baseRecord, recordId: "record-5", date: "2026-07-06", completionRate: 0.2 }
    ];

    expect(calculateLongestStreak(records)).toBe(3);
  });
});

describe("buildHeatmapDays", () => {
  it("returns exactly 60 days ending today", () => {
    const days = buildHeatmapDays([], "2026-07-22", 60);

    expect(days).toHaveLength(60);
    expect(days[0]?.date).toBe("2026-05-24");
    expect(days[59]?.date).toBe("2026-07-22");
  });

  it("includes today and sorts oldest to newest", () => {
    expect(
      buildHeatmapDays([{ ...baseRecord, completionRate: 1, isAllClear: true }], "2026-07-22", 3)
    ).toEqual([
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
        completionRate: 1,
        isAllClear: true,
        level: 4
      }
    ]);
  });

  it("maps missing records to zero completion and level 0", () => {
    const [missingDay] = buildHeatmapDays([baseRecord], "2026-07-22", 2);

    expect(missingDay).toEqual({
      date: "2026-07-21",
      completionRate: 0,
      isAllClear: false,
      level: 0
    });
  });

  it("maps 100 percent completion to level 4", () => {
    const [day] = buildHeatmapDays(
      [{ ...baseRecord, completionRate: 1, isAllClear: true }],
      "2026-07-22",
      1
    );

    expect(day).toMatchObject({
      date: "2026-07-22",
      completionRate: 1,
      isAllClear: true,
      level: 4
    });
  });
});
