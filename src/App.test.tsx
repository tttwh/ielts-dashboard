import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const setNumberField = (label: string, value: string) => {
    const input = screen.getByLabelText(label);

    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  };

  it("composes the shell with live default dashboard summary values", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "IELTS Prep Dashboard" })).toBeVisible();
    expect(screen.getByText("Target band")).toBeVisible();
    expect(screen.getByText("7")).toHaveClass("font-mono");
    expect(within(screen.getByTestId("summary-header")).getByText("0%")).toHaveClass("font-mono");
    expect(screen.getByText("0 days")).toHaveClass("font-mono");
    expect(screen.getByText("0 XP")).toHaveClass("font-mono");
    expect(screen.getByText("Level 1")).toHaveClass("font-mono");
    expect(screen.getByRole("main")).toBeVisible();
  });

  it("updates today's check-in values until All Clear appears", () => {
    render(<App />);

    setNumberField("Words actual", "100");
    setNumberField("Speaking topics actual", "3");
    setNumberField("Listening tests actual", "1");
    setNumberField("Corpus minutes actual", "30");

    expect(screen.getByText("Study time targets pending")).toBeVisible();
    expect(screen.queryByText("All Clear")).not.toBeInTheDocument();

    for (const label of ["Listening minutes", "Speaking minutes", "Reading minutes", "Writing minutes"]) {
      setNumberField(label, "0");
    }

    expect(screen.queryByText("Study time targets pending")).not.toBeInTheDocument();
    expect(screen.getByText("All Clear")).toBeVisible();
    expect(screen.getByText("120 XP")).toHaveClass("font-mono");
  });

  it("records manual external time into today's section-minute progress", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Listening 0/45 min")).toBeVisible();

    const manualForm = screen.getByTestId("manual-external-time-form");
    await user.selectOptions(within(manualForm).getByLabelText("Manual section"), "listening");
    await user.clear(within(manualForm).getByLabelText("Manual minutes"));
    await user.type(within(manualForm).getByLabelText("Manual minutes"), "45");
    await user.click(within(manualForm).getByRole("button", { name: /record external time/i }));

    expect(screen.queryByText("Listening 0/45 min")).not.toBeInTheDocument();
    expect(screen.getByText("Speaking 0/30 min")).toBeVisible();
  });
});
