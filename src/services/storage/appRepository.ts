import { createDefaultAppState } from "../../domain/defaults";
import { readState, writeState } from "./localStorageAdapter";
import type { AppRepository } from "./storageTypes";

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
