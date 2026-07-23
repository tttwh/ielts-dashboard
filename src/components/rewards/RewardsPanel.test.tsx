import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialAchievements } from "../../domain/achievements";
import { renderWithI18n } from "../../test/renderWithI18n";
import { RewardsPanel } from "./RewardsPanel";

describe("RewardsPanel", () => {
  it("renders level progress, unlocked badges, locked badges, and latest unlock pulse", () => {
    const achievements = createInitialAchievements("2026-07-22T00:00:00.000Z").map(
      (achievement) =>
        achievement.achievementId === "all-clear"
          ? {
              ...achievement,
              unlockedAt: "2026-07-22T08:00:00.000Z",
              updatedAt: "2026-07-22T08:00:00.000Z"
            }
          : achievement
    );

    renderWithI18n(
      <RewardsPanel
        achievements={achievements}
        latestUnlockedAchievementId="all-clear"
        level={3}
        xp={240}
      />
    );

    expect(screen.getByRole("heading", { name: "Rewards" })).toBeVisible();
    expect(screen.getByText("Level 3")).toBeVisible();
    expect(screen.getByText("40/100 XP")).toBeVisible();
    expect(screen.getByText("Latest unlock")).toBeVisible();

    const unlockedRow = screen.getByTestId("unlocked-achievements");
    expect(within(unlockedRow).getByText("All Clear")).toBeVisible();
    expect(within(unlockedRow).getByTestId("achievement-all-clear")).toHaveClass(
      "reward-badge--pulse"
    );

    const lockedRow = screen.getByTestId("locked-achievements");
    expect(within(lockedRow).getByText("First Check-in")).toBeVisible();
    expect(within(lockedRow).getByTestId("achievement-first-check-in")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});
