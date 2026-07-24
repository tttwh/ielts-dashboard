import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals } from "../domain/defaults";
import type { CompletionSummary, DailyRecord } from "../domain/types";
import { I18nProvider } from "../i18n/I18nProvider";
import { OverviewPage } from "./OverviewPage";

const todayRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-24",
  words: 0,
  speakingTopics: 0,
  listeningTests: 0,
  corpusMinutes: 0,
  sectionMinutes: {
    listening: 10,
    speaking: 0,
    reading: 20,
    writing: 0
  },
  readingOvertimeMinutes: 0,
  completionRate: 0.25,
  isAllClear: false,
  xpEarned: 25,
  createdAt: "2026-07-24T00:00:00.000Z",
  updatedAt: "2026-07-24T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
};

const summary: CompletionSummary = {
  completionRate: 0.25,
  enabledGoalCount: 8,
  isAllClear: false,
  isBalancedDay: false,
  itemProgress: {}
};

describe("OverviewPage", () => {
  it("renders compact overview cards and section balance", () => {
    render(
      <I18nProvider>
        <OverviewPage
          dailyGoals={createDefaultDailyGoals("2026-07-24T00:00:00.000Z")}
          level={2}
          onViewChange={vi.fn()}
          streakDays={3}
          summary={summary}
          todayRecord={todayRecord}
          xp={130}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();
    expect(screen.getByText("25%")).toBeVisible();
    expect(screen.getByText("30m")).toBeVisible();
    expect(screen.getByText("Listening")).toBeVisible();
    expect(screen.getByText("Reading")).toBeVisible();
  });
});
