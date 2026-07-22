import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultAppState } from "../domain/defaults";
import type { AppState } from "../services/storage/storageTypes";
import { createMemoryRepository } from "../services/storage/appRepository";
import { useDashboardData } from "./useDashboardData";

const today = "2026-07-22";
const now = "2026-07-22T08:00:00.000Z";

const createState = (): AppState => createDefaultAppState("2026-07-22T00:00:00.000Z");

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates today's record, recalculates completion, and saves state", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });

    expect(result.current.todayRecord).toMatchObject({
      date: today,
      words: 100,
      completionRate: 0.125,
      isAllClear: false,
      xpEarned: 13,
      updatedAt: now,
      syncStatus: "local-only"
    });
    expect(repo.loadAppState().records[0]).toMatchObject({
      date: today,
      words: 100,
      completionRate: 0.125,
      xpEarned: 13,
      syncStatus: "local-only"
    });
  });

  it("merges partial today record updates without dropping existing values", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 40, speakingTopics: 1 });
    });
    act(() => {
      result.current.updateTodayRecord({ corpusMinutes: 15 });
    });

    expect(result.current.todayRecord).toMatchObject({
      words: 40,
      speakingTopics: 1,
      corpusMinutes: 15
    });
    expect(repo.loadAppState().records).toHaveLength(1);
  });

  it("adds a timer session to today's section minutes and reading overtime", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.addTimerSession({
        sessionId: "session-1",
        userId: "local-user",
        date: today,
        section: "reading",
        source: "in-app-timer",
        plannedMinutes: 60,
        actualMinutes: 65,
        overtimeMinutes: 5,
        startedAt: "2026-07-22T06:55:00.000Z",
        endedAt: "2026-07-22T08:00:00.000Z",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local-only"
      });
    });

    expect(result.current.todayRecord.sectionMinutes.reading).toBe(65);
    expect(result.current.todayRecord.readingOvertimeMinutes).toBe(5);
    expect(repo.loadAppState().timerSessions).toHaveLength(1);
    expect(repo.loadAppState().records[0].sectionMinutes.reading).toBe(65);
  });

  it("updates profile and daily goals with local sync metadata", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateProfile({ targetBand: 8 });
      result.current.updateDailyGoals({
        wordsTarget: 120,
        sectionMinutesTarget: { reading: 75 }
      });
    });

    expect(result.current.state.profile).toMatchObject({
      targetBand: 8,
      updatedAt: now,
      syncStatus: "local"
    });
    expect(result.current.state.dailyGoals).toMatchObject({
      wordsTarget: 120,
      updatedAt: now,
      syncStatus: "local-only"
    });
    expect(result.current.state.dailyGoals.sectionMinutesTarget.reading).toBe(75);
    expect(repo.loadAppState().dailyGoals.wordsTarget).toBe(120);
  });

  it("recalculates today's record after daily goal changes", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({ words: 100 });
    });
    act(() => {
      result.current.updateDailyGoals({ wordsTarget: 200 });
    });

    expect(result.current.todayRecord.completionRate).toBe(0.0625);
    expect(result.current.todayRecord.xpEarned).toBe(6);
    expect(repo.loadAppState().records[0].completionRate).toBe(0.0625);
  });

  it("evaluates and persists achievement unlocks after today's record changes", () => {
    const repo = createMemoryRepository();
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.updateTodayRecord({
        words: 100,
        speakingTopics: 3,
        listeningTests: 1,
        corpusMinutes: 30,
        sectionMinutes: {
          listening: 45,
          speaking: 30,
          reading: 60,
          writing: 45
        }
      });
    });

    expect(result.current.state.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: "all-clear",
          unlockedAt: now,
          syncStatus: "local-only"
        })
      ])
    );
    expect(result.current.latestUnlockedAchievementId).toBe("all-clear");
    expect(
      repo
        .loadAppState()
        .achievements.find((achievement) => achievement.achievementId === "all-clear")?.unlockedAt
    ).toBe(now);
  });

  it("unlocks eligible achievements and persists them", () => {
    const state = createState();
    const repo = createMemoryRepository({
      ...state,
      records: [
        {
          recordId: "record-2026-07-22",
          userId: "local-user",
          date: today,
          words: 100,
          speakingTopics: 3,
          listeningTests: 1,
          corpusMinutes: 30,
          sectionMinutes: {
            listening: 45,
            speaking: 30,
            reading: 60,
            writing: 45
          },
          readingOvertimeMinutes: 0,
          completionRate: 1,
          isAllClear: true,
          xpEarned: 130,
          createdAt: "2026-07-22T00:00:00.000Z",
          updatedAt: "2026-07-22T00:00:00.000Z",
          deletedAt: null,
          syncStatus: "synced"
        }
      ]
    });
    const { result } = renderHook(() => useDashboardData(repo, today));

    act(() => {
      result.current.unlockAchievementsIfNeeded();
    });

    expect(result.current.state.achievements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: "all-clear",
          unlockedAt: now,
          syncStatus: "local-only"
        }),
        expect.objectContaining({
          achievementId: "balanced-day",
          unlockedAt: now,
          syncStatus: "local-only"
        })
      ])
    );
    expect(repo.loadAppState().achievements[0].unlockedAt).toBe(now);
  });
});
