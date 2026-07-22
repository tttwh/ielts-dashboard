import type { AppState } from "../services/storage/storageTypes";
import type { Achievement, DailyGoals, IeltsSection, SectionTargets, UserProfile } from "./types";

export const IELTS_SECTIONS: readonly IeltsSection[] = [
  "listening",
  "speaking",
  "reading",
  "writing"
];

export const SECTION_LABELS: Record<IeltsSection, string> = {
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing"
};

export const DEFAULT_SECTION_TARGETS: SectionTargets = {
  listening: 7,
  speaking: 7,
  reading: 7,
  writing: 7
};

export function createDefaultProfile(now: string): UserProfile {
  return {
    userId: "local-user",
    targetBand: 7,
    sectionTargets: { ...DEFAULT_SECTION_TARGETS },
    syncStatus: "local",
    createdAt: now,
    updatedAt: now
  };
}

export function createDefaultDailyGoals(): DailyGoals {
  return {
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
}

export function createInitialAchievements(): Achievement[] {
  return [
    {
      achievementId: "first-all-clear",
      name: "First All Clear",
      description: "Complete every enabled daily target once.",
      category: "milestone",
      unlockedAt: null
    },
    {
      achievementId: "balanced-day",
      name: "Balanced Day",
      description: "Study all four IELTS sections in one day.",
      category: "balance",
      unlockedAt: null
    },
    {
      achievementId: "seven-day-streak",
      name: "7-Day Streak",
      description: "Record study progress for seven consecutive days.",
      category: "streak",
      unlockedAt: null
    }
  ];
}

export function createDefaultAppState(now: string): AppState {
  return {
    schemaVersion: 1,
    profile: createDefaultProfile(now),
    dailyGoals: createDefaultDailyGoals(),
    records: [],
    timerSessions: [],
    achievements: createInitialAchievements()
  };
}
