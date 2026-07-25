import { createDefaultAppState } from "../../domain/defaults";
import { readState, writeState } from "./localStorageAdapter";
import type { AppRepository, AppState, AppStateCacheScope } from "./storageTypes";

const LOCAL_GUEST_USER_ID = "local-user";

const cacheScopeForState = (state: AppState): AppStateCacheScope =>
  state.profile.userId === LOCAL_GUEST_USER_ID
    ? { type: "guest" }
    : { type: "cloud", userId: state.profile.userId };

const cacheScopeKey = (scope: AppStateCacheScope) =>
  scope.type === "guest" ? "guest" : `cloud:${scope.userId}`;

const replaceStateUserId = (state: AppState, userId: string): AppState => ({
  ...state,
  profile: {
    ...state.profile,
    userId
  },
  dailyGoals: {
    ...state.dailyGoals,
    userId
  },
  records: state.records.map((record) => ({
    ...record,
    userId
  })),
  timerSessions: state.timerSessions.map((session) => ({
    ...session,
    userId
  })),
  achievements: state.achievements.map((achievement) => ({
    ...achievement,
    userId
  }))
});

const defaultStateForScope = (scope?: AppStateCacheScope): AppState => {
  const defaultState = createDefaultAppState(new Date().toISOString());

  return scope?.type === "cloud" ? replaceStateUserId(defaultState, scope.userId) : defaultState;
};

export function createLocalStorageRepository(): AppRepository {
  return {
    loadAppState(scope) {
      return readState(scope) ?? defaultStateForScope(scope);
    },
    saveAppState(state, scope) {
      writeState(state, scope);
    }
  };
}

export function createMemoryRepository(initialState?: AppState): AppRepository {
  const fallbackInitialState = initialState ?? createDefaultAppState("2026-07-22T00:00:00.000Z");
  let activeScope = cacheScopeForState(fallbackInitialState);
  const states = new Map<string, AppState>([
    [cacheScopeKey(activeScope), fallbackInitialState]
  ]);

  return {
    loadAppState: (scope) => {
      const nextScope = scope ?? activeScope;

      return states.get(cacheScopeKey(nextScope)) ?? defaultStateForScope(nextScope);
    },
    saveAppState: (nextState, scope) => {
      const nextScope = scope ?? cacheScopeForState(nextState);

      states.set(cacheScopeKey(nextScope), nextState);
      activeScope = nextScope;
    }
  };
}
