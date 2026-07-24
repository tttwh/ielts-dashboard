import type {
  Achievement,
  IeltsSection,
  SectionMinutes,
  SectionTargets,
  TimerSession
} from "../../domain/types";
import type { AppState } from "../storage/storageTypes";

export interface ProfileRow {
  user_id: string;
  account_name: string | null;
  email: string | null;
  status: "active" | "disabled" | "pending";
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  language: "zh-CN" | "en";
  created_at: string;
  updated_at: string;
}

export interface GoalsRow {
  goal_id?: string;
  user_id: string;
  overall_band: number;
  listening_band: number;
  speaking_band: number;
  reading_band: number;
  writing_band: number;
  words_target: number;
  speaking_topics_target: number;
  listening_tests_target: number;
  corpus_minutes_target: number;
  section_minutes_target: SectionMinutes;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DailyRecordRow {
  record_id: string;
  user_id: string;
  record_date: string;
  words_memorized: number;
  speaking_topics: number;
  listening_tests: number;
  corpus_minutes: number;
  section_minutes: SectionMinutes;
  reading_overtime_minutes: number;
  completion_rate: number;
  is_all_clear: boolean;
  xp_earned: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TimerSessionRow {
  session_id: string;
  user_id: string;
  record_date: string;
  section: IeltsSection;
  source: TimerSession["source"];
  planned_minutes: number;
  actual_minutes: number;
  overtime_minutes: number;
  started_at: string;
  ended_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AchievementRow {
  achievement_id: string;
  user_id: string;
  name: string;
  description: string;
  category: Achievement["category"];
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CloudRows {
  profile: ProfileRow | null;
  userSettings: UserSettingsRow | null;
  goals: GoalsRow | null;
  records: DailyRecordRow[];
  timerSessions: TimerSessionRow[];
  achievements: AchievementRow[];
}

const cloneSectionTargets = (targets: SectionTargets): SectionTargets => ({
  listening: targets.listening,
  speaking: targets.speaking,
  reading: targets.reading,
  writing: targets.writing
});

const cloneSectionMinutes = (minutes: SectionMinutes): SectionMinutes => ({
  listening: minutes.listening,
  speaking: minutes.speaking,
  reading: minutes.reading,
  writing: minutes.writing
});

export function appStateToCloudRows(state: AppState, accountName: string | null): CloudRows {
  return {
    profile: {
      user_id: state.profile.userId,
      account_name: accountName,
      email: null,
      status: "active",
      display_name: null,
      created_at: state.profile.createdAt,
      updated_at: state.profile.updatedAt
    },
    userSettings: {
      user_id: state.profile.userId,
      language: "zh-CN",
      created_at: state.profile.createdAt,
      updated_at: state.profile.updatedAt
    },
    goals: {
      user_id: state.dailyGoals.userId,
      overall_band: state.profile.targetBand,
      listening_band: state.profile.sectionTargets.listening,
      speaking_band: state.profile.sectionTargets.speaking,
      reading_band: state.profile.sectionTargets.reading,
      writing_band: state.profile.sectionTargets.writing,
      words_target: state.dailyGoals.wordsTarget,
      speaking_topics_target: state.dailyGoals.speakingTopicsTarget,
      listening_tests_target: state.dailyGoals.listeningTestsTarget,
      corpus_minutes_target: state.dailyGoals.corpusMinutesTarget,
      section_minutes_target: cloneSectionMinutes(state.dailyGoals.sectionMinutesTarget),
      created_at: state.dailyGoals.createdAt,
      updated_at: state.dailyGoals.updatedAt,
      deleted_at: state.dailyGoals.deletedAt
    },
    records: state.records.map((record) => ({
      record_id: record.recordId,
      user_id: record.userId,
      record_date: record.date,
      words_memorized: record.words,
      speaking_topics: record.speakingTopics,
      listening_tests: record.listeningTests,
      corpus_minutes: record.corpusMinutes,
      section_minutes: cloneSectionMinutes(record.sectionMinutes),
      reading_overtime_minutes: record.readingOvertimeMinutes,
      completion_rate: record.completionRate,
      is_all_clear: record.isAllClear,
      xp_earned: record.xpEarned,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted_at: record.deletedAt
    })),
    timerSessions: state.timerSessions.map((session) => ({
      session_id: session.sessionId,
      user_id: session.userId,
      record_date: session.date,
      section: session.section,
      source: session.source,
      planned_minutes: session.plannedMinutes,
      actual_minutes: session.actualMinutes,
      overtime_minutes: session.overtimeMinutes,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      deleted_at: session.deletedAt
    })),
    achievements: state.achievements.map((achievement) => ({
      achievement_id: achievement.achievementId,
      user_id: achievement.userId,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      unlocked_at: achievement.unlockedAt,
      created_at: achievement.createdAt,
      updated_at: achievement.updatedAt,
      deleted_at: achievement.deletedAt
    }))
  };
}

export function cloudRowsToAppState(rows: CloudRows, fallbackState: AppState): AppState {
  const profile = rows.profile;
  const goals = rows.goals;
  const profileUserId = profile?.user_id ?? goals?.user_id ?? fallbackState.profile.userId;

  return {
    schemaVersion: 1,
    profile: {
      ...fallbackState.profile,
      userId: profileUserId,
      targetBand: goals?.overall_band ?? fallbackState.profile.targetBand,
      sectionTargets: goals
        ? {
            listening: goals.listening_band,
            speaking: goals.speaking_band,
            reading: goals.reading_band,
            writing: goals.writing_band
          }
        : cloneSectionTargets(fallbackState.profile.sectionTargets),
      syncStatus: profile || goals ? "synced" : fallbackState.profile.syncStatus,
      createdAt: profile?.created_at ?? fallbackState.profile.createdAt,
      updatedAt: profile?.updated_at ?? fallbackState.profile.updatedAt
    },
    dailyGoals: goals
      ? {
          userId: goals.user_id,
          wordsTarget: goals.words_target,
          speakingTopicsTarget: goals.speaking_topics_target,
          listeningTestsTarget: goals.listening_tests_target,
          corpusMinutesTarget: goals.corpus_minutes_target,
          sectionMinutesTarget: cloneSectionMinutes(goals.section_minutes_target),
          createdAt: goals.created_at,
          updatedAt: goals.updated_at,
          deletedAt: goals.deleted_at,
          syncStatus: "synced"
      }
      : {
          ...fallbackState.dailyGoals,
          userId: profileUserId
        },
    records: rows.records.map((record) => ({
      recordId: record.record_id,
      userId: record.user_id,
      date: record.record_date,
      words: record.words_memorized,
      speakingTopics: record.speaking_topics,
      listeningTests: record.listening_tests,
      corpusMinutes: record.corpus_minutes,
      sectionMinutes: cloneSectionMinutes(record.section_minutes),
      readingOvertimeMinutes: record.reading_overtime_minutes,
      completionRate: record.completion_rate,
      isAllClear: record.is_all_clear,
      xpEarned: record.xp_earned,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      deletedAt: record.deleted_at,
      syncStatus: "synced"
    })),
    timerSessions: rows.timerSessions.map((session) => ({
      sessionId: session.session_id,
      userId: session.user_id,
      date: session.record_date,
      section: session.section,
      source: session.source,
      plannedMinutes: session.planned_minutes,
      actualMinutes: session.actual_minutes,
      overtimeMinutes: session.overtime_minutes,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      deletedAt: session.deleted_at,
      syncStatus: "synced"
    })),
    achievements: rows.achievements.map((achievement) => ({
      achievementId: achievement.achievement_id,
      userId: achievement.user_id,
      name: achievement.name,
      description: achievement.description,
      category: achievement.category,
      unlockedAt: achievement.unlocked_at,
      createdAt: achievement.created_at,
      updatedAt: achievement.updated_at,
      deletedAt: achievement.deleted_at,
      syncStatus: "synced"
    }))
  };
}
