import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Heatmap60 } from "./Heatmap60";
import type { DailyRecord } from "../../domain/types";

const baseRecord: DailyRecord = {
  recordId: "record-1",
  userId: "local-user",
  date: "2026-07-22",
  words: 0,
  speakingTopics: 0,
  listeningTests: 0,
  corpusMinutes: 0,
  sectionMinutes: {
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0
  },
  readingOvertimeMinutes: 0,
  completionRate: 1,
  isAllClear: true,
  xpEarned: 120,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "local-only"
};

describe("Heatmap60", () => {
  it("renders 60 accessible days with a 0 to 100 legend", async () => {
    const user = userEvent.setup();

    render(<Heatmap60 records={[baseRecord]} today="2026-07-22" />);

    const heatmap = screen.getByTestId("history-heatmap");
    const dayButtons = within(heatmap).getAllByRole("button");

    expect(dayButtons).toHaveLength(60);
    expect(dayButtons[0]).toHaveAccessibleName("2026-05-24, 0% complete");
    expect(dayButtons[59]).toHaveAccessibleName("2026-07-22, 100% complete");
    const legend = within(heatmap).getByTestId("heatmap-legend");
    expect(within(legend).getByText("0%")).toBeVisible();
    expect(within(legend).getByText("100%")).toBeVisible();

    await user.hover(dayButtons[59]);

    expect(within(heatmap).getByTestId("heatmap-day-detail")).toHaveTextContent(
      "2026-07-22 - 100% complete"
    );
  });

  it("updates the active detail when records change", () => {
    const { rerender } = render(<Heatmap60 records={[]} today="2026-07-22" />);

    expect(screen.getByTestId("heatmap-day-detail")).toHaveTextContent(
      "2026-07-22 - 0% complete"
    );

    rerender(<Heatmap60 records={[baseRecord]} today="2026-07-22" />);

    expect(screen.getByTestId("heatmap-day-detail")).toHaveTextContent(
      "2026-07-22 - 100% complete"
    );
  });
});
