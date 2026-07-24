export type IeltsSection = "listening" | "speaking" | "reading" | "writing";
export type SyncStatus = "local-only" | "synced" | "pending" | "conflict";

export type SectionTargets = Record<IeltsSection, number>;
export type SectionMinutes = Record<IeltsSection, number>;

export interface UserProfile {
  userId: string;
  targetBand: number;
  sectionTargets: SectionTargets;
  syncStatus: "local" | "cloud-ready" | "synced";
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoals {
  userId: string;
  wordsTarget: number;
  speakingTopicsTarget: number;
  listeningTestsTarget: number;
  corpusMinutesTarget: number;
  sectionMinutesTarget: SectionMinutes;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface DailyRecord {
  recordId: string;
  userId: string;
  date: string;
  words: number;
  speakingTopics: number;
  listeningTests: number;
  corpusMinutes: number;
  sectionMinutes: SectionMinutes;
  readingOvertimeMinutes: number;
  completionRate: number;
  isAllClear: boolean;
  xpEarned: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface TimerSession {
  sessionId: string;
  userId: string;
  date: string;
  section: IeltsSection;
  source: "in-app-timer" | "manual-external";
  plannedMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface Achievement {
  achievementId: string;
  userId: string;
  name: string;
  description: string;
  category: "streak" | "skill" | "milestone" | "balance";
  unlockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
}

export interface CompletionSummary {
  completionRate: number;
  isAllClear: boolean;
  isBalancedDay: boolean;
  enabledGoalCount: number;
  itemProgress: Record<string, number>;
}

export interface HeatmapDay {
  date: string;
  completionRate: number;
  isAllClear: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}
