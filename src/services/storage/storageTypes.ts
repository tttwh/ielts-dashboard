import type {
  Achievement,
  DailyGoals,
  DailyRecord,
  TimerSession,
  UserProfile
} from "../../domain/types";

export interface AppState {
  schemaVersion: 1;
  profile: UserProfile;
  dailyGoals: DailyGoals;
  records: DailyRecord[];
  timerSessions: TimerSession[];
  achievements: Achievement[];
}

export interface AppRepository {
  loadAppState(): AppState;
  saveAppState(state: AppState): void;
}

export type AppStateMutation = (state: AppState) => AppState;
