import type { AppState } from "./storageTypes";

const STORAGE_KEY = "ielts-dashboard-state";
const IELTS_SECTIONS = ["listening", "speaking", "reading", "writing"] as const;
const PROFILE_SYNC_STATUSES = ["local", "cloud-ready", "synced"] as const;
const SYNC_STATUSES = ["local-only", "synced", "pending", "conflict", "sync-error"] as const;
const ACCOUNT_STATUSES = ["active", "disabled", "pending"] as const;
const TIMER_SOURCES = ["in-app-timer", "manual-external"] as const;
const ACHIEVEMENT_CATEGORIES = ["streak", "skill", "milestone", "balance"] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value);

const isOneOf = <T extends string>(allowedValues: readonly T[], value: unknown): value is T =>
  isString(value) && (allowedValues as readonly string[]).includes(value);

const isOptionalOneOf = <T extends string>(allowedValues: readonly T[], value: unknown): value is T | undefined =>
  value === undefined || isOneOf(allowedValues, value);

const isSectionNumberRecord = (value: unknown): value is Record<(typeof IELTS_SECTIONS)[number], number> =>
  isObject(value) && IELTS_SECTIONS.every((section) => isNumber(value[section]));

const isUserProfile = (value: unknown) =>
  isObject(value) &&
  isString(value.userId) &&
  isNumber(value.targetBand) &&
  isSectionNumberRecord(value.sectionTargets) &&
  isOneOf(PROFILE_SYNC_STATUSES, value.syncStatus) &&
  isOptionalOneOf(ACCOUNT_STATUSES, value.accountStatus) &&
  isString(value.createdAt) &&
  isString(value.updatedAt);

const isDailyGoals = (value: unknown) =>
  isObject(value) &&
  isString(value.userId) &&
  isNumber(value.wordsTarget) &&
  isNumber(value.speakingTopicsTarget) &&
  isNumber(value.listeningTestsTarget) &&
  isNumber(value.corpusMinutesTarget) &&
  isSectionNumberRecord(value.sectionMinutesTarget) &&
  isString(value.createdAt) &&
  isString(value.updatedAt) &&
  isNullableString(value.deletedAt) &&
  isOneOf(SYNC_STATUSES, value.syncStatus);

const isDailyRecord = (value: unknown) =>
  isObject(value) &&
  isString(value.recordId) &&
  isString(value.userId) &&
  isString(value.date) &&
  isNumber(value.words) &&
  isNumber(value.speakingTopics) &&
  isNumber(value.listeningTests) &&
  isNumber(value.corpusMinutes) &&
  isSectionNumberRecord(value.sectionMinutes) &&
  isNumber(value.readingOvertimeMinutes) &&
  isNumber(value.completionRate) &&
  isBoolean(value.isAllClear) &&
  isNumber(value.xpEarned) &&
  isString(value.createdAt) &&
  isString(value.updatedAt) &&
  isNullableString(value.deletedAt) &&
  isOneOf(SYNC_STATUSES, value.syncStatus);

const isTimerSession = (value: unknown) =>
  isObject(value) &&
  isString(value.sessionId) &&
  isString(value.userId) &&
  isString(value.date) &&
  isOneOf(IELTS_SECTIONS, value.section) &&
  isOneOf(TIMER_SOURCES, value.source) &&
  isNumber(value.plannedMinutes) &&
  isNumber(value.actualMinutes) &&
  isNumber(value.overtimeMinutes) &&
  isString(value.startedAt) &&
  isString(value.endedAt) &&
  isString(value.createdAt) &&
  isString(value.updatedAt) &&
  isNullableString(value.deletedAt) &&
  isOneOf(SYNC_STATUSES, value.syncStatus);

const isAchievement = (value: unknown) =>
  isObject(value) &&
  isString(value.achievementId) &&
  isString(value.userId) &&
  isString(value.name) &&
  isString(value.description) &&
  isOneOf(ACHIEVEMENT_CATEGORIES, value.category) &&
  isNullableString(value.unlockedAt) &&
  isString(value.createdAt) &&
  isString(value.updatedAt) &&
  isNullableString(value.deletedAt) &&
  isOneOf(SYNC_STATUSES, value.syncStatus);

const isAppState = (value: unknown): value is AppState => {
  if (!isObject(value)) return false;

  return (
    value.schemaVersion === 1 &&
    isUserProfile(value.profile) &&
    isDailyGoals(value.dailyGoals) &&
    Array.isArray(value.records) &&
    value.records.every(isDailyRecord) &&
    Array.isArray(value.timerSessions) &&
    value.timerSessions.every(isTimerSession) &&
    Array.isArray(value.achievements) &&
    value.achievements.every(isAchievement)
  );
};

export function readState(): AppState | null {
  const rawState = localStorage.getItem(STORAGE_KEY);
  if (!rawState) return null;

  try {
    const parsedState: unknown = JSON.parse(rawState);
    return isAppState(parsedState) ? parsedState : null;
  } catch {
    return null;
  }
}

export function writeState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
