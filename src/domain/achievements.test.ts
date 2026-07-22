import { describe, expect, it } from "vitest";
import { addDays } from "../lib/date";
import { evaluateAchievements } from "./achievements";
import type { Achievement, DailyRecord, SectionMinutes } from "./types";

const now = "2026-07-22T08:00:00.000Z";
const today = "2026-07-22";

const emptySectionMinutes: SectionMinutes = {
  listening: 0,
  speaking: 0,
  reading: 0,
  writing: 0
};

const expectedBadgeNames = [
  "First Check-in",
  "All Clear",
  "7-Day Streak",
  "14-Day Streak",
  "Reading Discipline",
  "Listening Builder",
  "Speaking Starter",
  "Writing Keeper",
  "Balanced Day",
  "60-Day Witness"
];

const createRecord = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
  recordId: "record-2026-07-22",
  userId: "local-user",
  date: "2026-07-22",
  words: 0,
  speakingTopics: 0,
  listeningTests: 0,
  corpusMinutes: 0,
  sectionMinutes: { ...emptySectionMinutes },
  readingOvertimeMinutes: 0,
  completionRate: 0,
  isAllClear: false,
  xpEarned: 0,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only",
  ...overrides
});

const createExistingAchievement = (overrides: Partial<Achievement>): Achievement => ({
  achievementId: "all-clear",
  userId: "local-user",
  name: "All Clear",
  description: "Complete every enabled daily target once.",
  category: "milestone",
  unlockedAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only",
  ...overrides
});

const findByName = (achievements: Achievement[], name: string) =>
  achievements.find((achievement) => achievement.name === name);

const buildConsecutiveStudyRecords = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    createRecord({
      recordId: `record-${index}`,
      date: `2026-07-${String(22 - index).padStart(2, "0")}`,
      completionRate: 0.2,
      xpEarned: 20
    })
  );

const buildConsecutiveStudyRecordsEndingOn = (date: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    createRecord({
      recordId: `record-${date}-${index}`,
      date: addDays(date, -index),
      words: 1
    })
  );

describe("evaluateAchievements", () => {
  it("returns the first-version badge set with locked badges visible", () => {
    const achievements = evaluateAchievements({
      records: [],
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(achievements.map((achievement) => achievement.name)).toEqual(expectedBadgeNames);
    expect(achievements.every((achievement) => achievement.unlockedAt === null)).toBe(true);
  });

  it("unlocks First Check-in after any record has completion above 0", () => {
    const achievements = evaluateAchievements({
      records: [createRecord({ completionRate: 0.01, xpEarned: 1 })],
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "First Check-in")?.unlockedAt).toBe(now);
  });

  it("unlocks All Clear after any record has isAllClear", () => {
    const achievements = evaluateAchievements({
      records: [createRecord({ completionRate: 1, isAllClear: true, xpEarned: 120 })],
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "All Clear")?.unlockedAt).toBe(now);
  });

  it("unlocks Balanced Day when four section minutes are all above 0", () => {
    const achievements = evaluateAchievements({
      records: [
        createRecord({
          sectionMinutes: {
            listening: 1,
            speaking: 1,
            reading: 1,
            writing: 1
          }
        })
      ],
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "Balanced Day")?.unlockedAt).toBe(now);
  });

  it("unlocks 7-Day Streak after seven consecutive study days", () => {
    const achievements = evaluateAchievements({
      records: buildConsecutiveStudyRecords(7),
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "7-Day Streak")?.unlockedAt).toBe(now);
  });

  it("unlocks streak badges from the longest historical run even when it does not end today", () => {
    const achievements = evaluateAchievements({
      records: buildConsecutiveStudyRecordsEndingOn("2026-07-15", 14),
      timerSessions: [],
      achievements: [],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "7-Day Streak")?.unlockedAt).toBe(now);
    expect(findByName(achievements, "14-Day Streak")?.unlockedAt).toBe(now);
  });

  it("never resets an existing unlockedAt on later evaluations", () => {
    const unlockedAt = "2026-07-10T09:00:00.000Z";
    const achievements = evaluateAchievements({
      records: [],
      timerSessions: [],
      achievements: [
        createExistingAchievement({
          achievementId: "all-clear",
          unlockedAt,
          updatedAt: unlockedAt,
          syncStatus: "pending"
        })
      ],
      now,
      today,
      userId: "local-user"
    });

    expect(findByName(achievements, "All Clear")).toMatchObject({
      unlockedAt,
      updatedAt: unlockedAt,
      syncStatus: "pending"
    });
  });
});
