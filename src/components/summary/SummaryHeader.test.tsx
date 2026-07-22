import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultAppState } from "../../domain/defaults";
import type { CompletionSummary } from "../../domain/types";
import { SummaryHeader } from "./SummaryHeader";

const summary: CompletionSummary = {
  completionRate: 0.625,
  isAllClear: false,
  isBalancedDay: true,
  enabledGoalCount: 8,
  itemProgress: {}
};

describe("SummaryHeader", () => {
  it("renders IELTS target, completion, streak, XP, level, and local schema status", () => {
    const state = createDefaultAppState("2026-07-22T00:00:00.000Z");

    render(
      <SummaryHeader
        level={3}
        state={{ ...state, profile: { ...state.profile, targetBand: 7.5 } }}
        streakDays={4}
        summary={summary}
        xp={240}
      />
    );

    expect(screen.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
    expect(screen.getByText("Target band")).toBeVisible();
    expect(screen.getByText("7.5")).toHaveClass("font-mono");
    expect(screen.getByText("Today completion")).toBeVisible();
    expect(screen.getByText("63%")).toHaveClass("font-mono");
    expect(screen.getByText("4 days")).toHaveClass("font-mono");
    expect(screen.getByText("240 XP")).toHaveClass("font-mono");
    expect(screen.getByText("Level 3")).toHaveClass("font-mono");
    expect(screen.getByText("Local mode · cloud-ready schema")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Today completion" })).toHaveAttribute(
      "aria-valuenow",
      "63"
    );
  });
});
