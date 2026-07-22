import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageRepository } from "./appRepository";

describe("local storage repository", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default state when storage is empty", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();

    expect(state.profile.userId).toBe("local-user");
    expect(state.records).toEqual([]);
    expect(state.schemaVersion).toBe(1);
  });

  it("persists and reloads app state", () => {
    const repo = createLocalStorageRepository();
    const state = repo.loadAppState();

    repo.saveAppState({
      ...state,
      profile: { ...state.profile, targetBand: 8 }
    });

    expect(createLocalStorageRepository().loadAppState().profile.targetBand).toBe(8);
  });

  it("recovers from malformed JSON by returning defaults", () => {
    localStorage.setItem("ielts-dashboard-state", "{bad-json");
    const repo = createLocalStorageRepository();

    expect(repo.loadAppState().profile.userId).toBe("local-user");
  });

  it("recovers from incompatible schema by returning defaults", () => {
    localStorage.setItem("ielts-dashboard-state", JSON.stringify({ schemaVersion: 2 }));
    const repo = createLocalStorageRepository();

    expect(repo.loadAppState().schemaVersion).toBe(1);
    expect(repo.loadAppState().profile.userId).toBe("local-user");
  });
});
