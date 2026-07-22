import type { AppState } from "../services/storage/storageTypes";
import { createInitialAchievements } from "./achievements";
import type { DailyGoals, IeltsSection, SectionTargets, UserProfile } from "./types";

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

export function createDefaultDailyGoals(now: string = new Date().toISOString()): DailyGoals {
  return {
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
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local-only"
  };
}

export function createDefaultAppState(now: string): AppState {
  return {
    schemaVersion: 1,
    profile: createDefaultProfile(now),
    dailyGoals: createDefaultDailyGoals(now),
    records: [],
    timerSessions: [],
    achievements: createInitialAchievements(now)
  };
}
