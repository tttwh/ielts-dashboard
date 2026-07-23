import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals } from "../../domain/defaults";
import { renderWithI18n } from "../../test/renderWithI18n";
import { StudyTimerPanel } from "./StudyTimerPanel";

const dailyGoals = createDefaultDailyGoals("2026-07-22T00:00:00.000Z");

describe("StudyTimerPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records a manual external time entry with the selected section and source", async () => {
    const user = userEvent.setup();
    const addTimerSession = vi.fn();

    renderWithI18n(
      <StudyTimerPanel
        addTimerSession={addTimerSession}
        dailyGoals={dailyGoals}
        today="2026-07-22"
        userId="local-user"
      />
    );

    const manualForm = screen.getByTestId("manual-external-time-form");
    await user.selectOptions(within(manualForm).getByLabelText("Manual section"), "writing");
    await user.clear(within(manualForm).getByLabelText("Manual minutes"));
    await user.type(within(manualForm).getByLabelText("Manual minutes"), "45");
    await user.click(within(manualForm).getByRole("button", { name: /record external time/i }));

    expect(addTimerSession).toHaveBeenCalledTimes(1);
    expect(addTimerSession).toHaveBeenCalledWith(
      expect.objectContaining({
        date: "2026-07-22",
        section: "writing",
        source: "manual-external",
        plannedMinutes: 45,
        actualMinutes: 45,
        overtimeMinutes: 0,
        userId: "local-user"
      })
    );
    expect(screen.getByText("Manual external time")).toBeVisible();
  });

  it("shows reading overtime warning after the 60 minute planned time", () => {
    vi.useFakeTimers();

    renderWithI18n(
      <StudyTimerPanel
        addTimerSession={() => undefined}
        dailyGoals={dailyGoals}
        today="2026-07-22"
        userId="local-user"
      />
    );

    expect(screen.getByRole("button", { name: "Reading" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("Planned 60 min")).toBeVisible();

    act(() => {
      screen.getByRole("button", { name: /start/i }).click();
    });
    act(() => {
      vi.advanceTimersByTime(62 * 60 * 1000);
    });

    expect(screen.getByText("Overtime 2 min")).toBeVisible();
  });
});
