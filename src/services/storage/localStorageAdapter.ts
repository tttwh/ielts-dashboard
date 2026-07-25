import type { AppState, AppStateCacheScope } from "./storageTypes";

const STORAGE_KEY = "ielts-dashboard-state";
const ACTIVE_CACHE_KEY = `${STORAGE_KEY}:active`;
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const CLOUD_STORAGE_KEY_PREFIX = `${STORAGE_KEY}:cloud:`;
const LOCAL_GUEST_USER_ID = "local-user";
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

const parseState = (rawState: string | null): AppState | null => {
  if (!rawState) return null;

  try {
    const parsedState: unknown = JSON.parse(rawState);
    return isAppState(parsedState) ? parsedState : null;
  } catch {
    return null;
  }
};

const storageKeyForScope = (scope: AppStateCacheScope) =>
  scope.type === "guest"
    ? GUEST_STORAGE_KEY
    : `${CLOUD_STORAGE_KEY_PREFIX}${encodeURIComponent(scope.userId)}`;

const cacheScopeForState = (state: AppState): AppStateCacheScope =>
  state.profile.userId === LOCAL_GUEST_USER_ID
    ? { type: "guest" }
    : { type: "cloud", userId: state.profile.userId };

const stateMatchesScope = (state: AppState, scope: AppStateCacheScope) =>
  scope.type === "guest"
    ? state.profile.userId === LOCAL_GUEST_USER_ID
    : state.profile.userId === scope.userId;

const migrateLegacyState = (state: AppState): AppState => {
  const scopedStorageKey = storageKeyForScope(cacheScopeForState(state));

  if (!localStorage.getItem(scopedStorageKey)) {
    localStorage.setItem(scopedStorageKey, JSON.stringify(state));
  }
  if (!localStorage.getItem(ACTIVE_CACHE_KEY)) {
    localStorage.setItem(ACTIVE_CACHE_KEY, scopedStorageKey);
  }

  return state;
};

const readScopedState = (scope: AppStateCacheScope): AppState | null => {
  const scopedState = parseState(localStorage.getItem(storageKeyForScope(scope)));
  if (scopedState) return scopedState;

  const legacyState = parseState(localStorage.getItem(STORAGE_KEY));
  return legacyState && stateMatchesScope(legacyState, scope) ? migrateLegacyState(legacyState) : null;
};

export function readState(scope?: AppStateCacheScope): AppState | null {
  if (scope) {
    return readScopedState(scope);
  }

  const activeCacheKey = localStorage.getItem(ACTIVE_CACHE_KEY);
  if (activeCacheKey) {
    const activeState = parseState(localStorage.getItem(activeCacheKey));
    if (activeState) return activeState;
  }

  const legacyState = parseState(localStorage.getItem(STORAGE_KEY));
  if (legacyState) return migrateLegacyState(legacyState);

  return parseState(localStorage.getItem(GUEST_STORAGE_KEY));
}

export function writeState(state: AppState, scope: AppStateCacheScope = cacheScopeForState(state)): void {
  const serializedState = JSON.stringify(state);
  const scopedStorageKey = storageKeyForScope(scope);

  localStorage.setItem(scopedStorageKey, serializedState);
  localStorage.setItem(STORAGE_KEY, serializedState);
  localStorage.setItem(ACTIVE_CACHE_KEY, scopedStorageKey);
}
