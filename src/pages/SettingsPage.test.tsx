import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals, createDefaultProfile } from "../domain/defaults";
import { renderWithI18n } from "../test/renderWithI18n";
import { SettingsPage } from "./SettingsPage";

const now = "2026-07-27T00:00:00.000Z";

describe("SettingsPage", () => {
  it("shows localized sync error code messages outside the overview header", () => {
    renderWithI18n(
      <SettingsPage
        cloudbaseConfigured
        dailyGoals={createDefaultDailyGoals(now)}
        profile={createDefaultProfile(now)}
        syncState={{
          mode: "error",
          code: "cloudbase-api-unavailable",
          message: null,
          lastSyncedAt: null
        }}
        updateDailyGoals={vi.fn()}
        updateProfile={vi.fn()}
      />
    );

    expect(screen.getByText("Sync error")).toBeVisible();
    expect(
      screen.getByText("CloudBase data API is temporarily unavailable. Refresh or sign in again shortly.")
    ).toBeVisible();
  });
});
