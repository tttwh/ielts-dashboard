import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it("updates today's check-in values until All Clear appears", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.clear(screen.getByLabelText("Words actual"));
    await user.type(screen.getByLabelText("Words actual"), "100");
    await user.clear(screen.getByLabelText("Speaking topics actual"));
    await user.type(screen.getByLabelText("Speaking topics actual"), "3");
    await user.clear(screen.getByLabelText("Listening tests actual"));
    await user.type(screen.getByLabelText("Listening tests actual"), "1");
    await user.clear(screen.getByLabelText("Corpus minutes actual"));
    await user.type(screen.getByLabelText("Corpus minutes actual"), "30");

    expect(screen.getByText("Study time targets pending")).toBeVisible();
    expect(screen.queryByText("All Clear")).not.toBeInTheDocument();

    for (const label of ["Listening minutes", "Speaking minutes", "Reading minutes", "Writing minutes"]) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), "0");
    }

    expect(screen.queryByText("Study time targets pending")).not.toBeInTheDocument();
    expect(screen.getByText("All Clear")).toBeVisible();
    expect(screen.getByText("120 XP")).toHaveClass("font-mono");
  });
});
