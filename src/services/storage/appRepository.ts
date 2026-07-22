import { createDefaultAppState } from "../../domain/defaults";
import { readState, writeState } from "./localStorageAdapter";
import type { AppRepository, AppState } from "./storageTypes";

export function createLocalStorageRepository(): AppRepository {
  return {
    loadAppState() {
      return readState() ?? createDefaultAppState(new Date().toISOString());
    },
    saveAppState(state) {
      writeState(state);
    }
  };
}

export function createMemoryRepository(initialState?: AppState): AppRepository {
  let state = initialState ?? createDefaultAppState("2026-07-22T00:00:00.000Z");

  return {
    loadAppState: () => state,
    saveAppState: (nextState) => {
      state = nextState;
    }
  };
}
