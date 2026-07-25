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

export type AppStateCacheScope =
  | {
      type: "guest";
    }
  | {
      type: "cloud";
      userId: string;
    };

export interface AppRepository {
  loadAppState(scope?: AppStateCacheScope): AppState;
  saveAppState(state: AppState, scope?: AppStateCacheScope): void;
}

export type AppStateMutation = (state: AppState) => AppState;
