import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createDefaultDailyGoals } from "../../domain/defaults";
import { createEmptyDailyRecord } from "../../domain/progress";
import { renderWithI18n } from "../../test/renderWithI18n";
import { DailyCheckIn } from "./DailyCheckIn";

const now = "2026-07-22T00:00:00.000Z";
const goals = createDefaultDailyGoals(now);

const createRecord = () => createEmptyDailyRecord("2026-07-22", "local-user", now);

describe("DailyCheckIn", () => {
  it("shows task actuals, targets, progress, and completion states", () => {
    renderWithI18n(
      <DailyCheckIn
        dailyGoals={goals}
        todayRecord={{
          ...createRecord(),
          words: 50,
          speakingTopics: 3,
          listeningTests: 0,
          corpusMinutes: 30
        }}
        updateTodayRecord={() => undefined}
      />
    );

    const wordsRow = screen.getByTestId("checkin-row-words");
    expect(within(wordsRow).getByText("Words")).toBeVisible();
    expect(within(wordsRow).getByLabelText("Words actual")).toHaveValue(50);
    expect(within(wordsRow).getByText("Target")).toBeVisible();
    expect(within(wordsRow).getByText("100")).toBeVisible();
    expect(within(wordsRow).getByText("50%")).toBeVisible();
    expect(within(wordsRow).getByLabelText("Words incomplete")).toBeVisible();

    const speakingRow = screen.getByTestId("checkin-row-speaking-topics");
    expect(within(speakingRow).getByLabelText("Speaking topics complete")).toBeVisible();
    expect(within(speakingRow).getByText("100%")).toBeVisible();

    const listeningRow = screen.getByTestId("checkin-row-listening-tests");
    expect(within(listeningRow).getByText("Target")).toBeVisible();
    expect(within(listeningRow).getByText("1")).toBeVisible();
    expect(within(listeningRow).getByLabelText("Listening tests incomplete")).toBeVisible();
  });

  it("surfaces pending study-time targets that also gate All Clear", () => {
    renderWithI18n(
      <DailyCheckIn
        dailyGoals={goals}
        todayRecord={{
          ...createRecord(),
          words: goals.wordsTarget,
          speakingTopics: goals.speakingTopicsTarget,
          listeningTests: goals.listeningTestsTarget,
          corpusMinutes: goals.corpusMinutesTarget
        }}
        updateTodayRecord={() => undefined}
      />
    );

    const status = screen.getByTestId("checkin-study-time-status");
    expect(within(status).getByText("Study time targets pending")).toBeVisible();
    expect(within(status).getByText("Listening 0/45 min")).toBeVisible();
    expect(within(status).getByText("Speaking 0/30 min")).toBeVisible();
    expect(within(status).getByText("Reading 0/60 min")).toBeVisible();
    expect(within(status).getByText("Writing 0/45 min")).toBeVisible();
    expect(screen.queryByText("All Clear")).not.toBeInTheDocument();
  });

  it("hides the pending study-time notice when section-minute targets are off or already met", () => {
    const sectionTargetsOff = {
      ...goals,
      sectionMinutesTarget: {
        listening: 0,
        speaking: 0,
        reading: 0,
        writing: 0
      }
    };
    const completeRecord = {
      ...createRecord(),
      sectionMinutes: {
        listening: 45,
        speaking: 30,
        reading: 60,
        writing: 45
      }
    };

    const { rerender } = renderWithI18n(
      <DailyCheckIn
        dailyGoals={sectionTargetsOff}
        todayRecord={createRecord()}
        updateTodayRecord={() => undefined}
      />
    );

    expect(screen.queryByTestId("checkin-study-time-status")).not.toBeInTheDocument();

    rerender(
      <DailyCheckIn
        dailyGoals={goals}
        todayRecord={completeRecord}
        updateTodayRecord={() => undefined}
      />
    );

    expect(screen.queryByTestId("checkin-study-time-status")).not.toBeInTheDocument();
  });

  it("announces zero-target rows as off instead of incomplete", () => {
    renderWithI18n(
      <DailyCheckIn
        dailyGoals={{ ...goals, wordsTarget: 0 }}
        todayRecord={createRecord()}
        updateTodayRecord={() => undefined}
      />
    );

    const wordsRow = screen.getByTestId("checkin-row-words");
    expect(within(wordsRow).getByText("Off")).toBeVisible();
    expect(within(wordsRow).getByLabelText("Words off")).toBeVisible();
    expect(within(wordsRow).queryByLabelText("Words incomplete")).not.toBeInTheDocument();
  });

  it("updates today's record from each daily task input", async () => {
    const user = userEvent.setup();
    const updateTodayRecord = vi.fn();

    renderWithI18n(
      <DailyCheckIn
        dailyGoals={goals}
        todayRecord={createRecord()}
        updateTodayRecord={updateTodayRecord}
      />
    );

    await user.clear(screen.getByLabelText("Words actual"));
    await user.type(screen.getByLabelText("Words actual"), "120");
    expect(updateTodayRecord).toHaveBeenLastCalledWith({ words: 120 });

    await user.clear(screen.getByLabelText("Speaking topics actual"));
    await user.type(screen.getByLabelText("Speaking topics actual"), "2");
    expect(updateTodayRecord).toHaveBeenLastCalledWith({ speakingTopics: 2 });

    await user.clear(screen.getByLabelText("Listening tests actual"));
    await user.type(screen.getByLabelText("Listening tests actual"), "1");
    expect(updateTodayRecord).toHaveBeenLastCalledWith({ listeningTests: 1 });

    await user.clear(screen.getByLabelText("Corpus minutes actual"));
    await user.type(screen.getByLabelText("Corpus minutes actual"), "35");
    expect(updateTodayRecord).toHaveBeenLastCalledWith({ corpusMinutes: 35 });
  });

  it("shows a pulsing All Clear badge only from the record state", () => {
    renderWithI18n(
      <DailyCheckIn
        dailyGoals={goals}
        todayRecord={{ ...createRecord(), isAllClear: true }}
        updateTodayRecord={() => undefined}
      />
    );

    expect(screen.getByText("All Clear")).toHaveClass("checkin-all-clear-badge");
  });
});
