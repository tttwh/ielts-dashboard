import type { AppState } from "./storageTypes";

const STORAGE_KEY = "ielts-dashboard-state";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAppState = (value: unknown): value is AppState => {
  if (!isObject(value)) return false;

  return (
    value.schemaVersion === 1 &&
    isObject(value.profile) &&
    isObject(value.dailyGoals) &&
    Array.isArray(value.records) &&
    Array.isArray(value.timerSessions) &&
    Array.isArray(value.achievements)
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
