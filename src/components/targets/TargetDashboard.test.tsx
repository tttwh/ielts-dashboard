import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals, createDefaultProfile } from "../../domain/defaults";
import { TargetDashboard } from "./TargetDashboard";

describe("TargetDashboard", () => {
  it("updates total and section band targets through the profile updater", async () => {
    const user = userEvent.setup();
    const updateProfile = vi.fn();

    render(
      <TargetDashboard
        dailyGoals={createDefaultDailyGoals("2026-07-22T00:00:00.000Z")}
        profile={createDefaultProfile("2026-07-22T00:00:00.000Z")}
        updateDailyGoals={() => undefined}
        updateProfile={updateProfile}
      />
    );

    await user.clear(screen.getByLabelText("Total band"));
    await user.type(screen.getByLabelText("Total band"), "7.5");

    expect(updateProfile).toHaveBeenLastCalledWith({ targetBand: 7.5 });

    await user.clear(screen.getByLabelText("Reading band"));
    await user.type(screen.getByLabelText("Reading band"), "8");

    expect(updateProfile).toHaveBeenLastCalledWith({ sectionTargets: { reading: 8 } });
  });

  it("updates daily goal values through the daily goals updater", async () => {
    const user = userEvent.setup();
    const updateDailyGoals = vi.fn();

    render(
      <TargetDashboard
        dailyGoals={createDefaultDailyGoals("2026-07-22T00:00:00.000Z")}
        profile={createDefaultProfile("2026-07-22T00:00:00.000Z")}
        updateDailyGoals={updateDailyGoals}
        updateProfile={() => undefined}
      />
    );

    await user.clear(screen.getByLabelText("Words"));
    await user.type(screen.getByLabelText("Words"), "200");

    expect(updateDailyGoals).toHaveBeenLastCalledWith({ wordsTarget: 200 });

    await user.clear(screen.getByLabelText("Reading minutes"));
    await user.type(screen.getByLabelText("Reading minutes"), "90");

    expect(updateDailyGoals).toHaveBeenLastCalledWith({ sectionMinutesTarget: { reading: 90 } });
  });
});
