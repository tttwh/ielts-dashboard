import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("0%")).toHaveClass("font-mono");
    expect(screen.getByText("0 days")).toHaveClass("font-mono");
    expect(screen.getByText("0 XP")).toHaveClass("font-mono");
    expect(screen.getByText("Level 1")).toHaveClass("font-mono");
    expect(screen.getByRole("main")).toBeVisible();
  });
});
