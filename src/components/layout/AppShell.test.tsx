import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../test/renderWithI18n";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("places navigation, summary, and active main content in the shell", () => {
    const onViewChange = vi.fn();

    renderWithI18n(
      <AppShell
        activeView="overview"
        onViewChange={onViewChange}
        summary={<div data-testid="summary">Summary</div>}
      >
        <div>Main workspace</div>
      </AppShell>
    );

    expect(screen.getByTestId("summary")).toBeVisible();
    expect(screen.getByTestId("dashboard-navigation")).toBeVisible();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("main")).toHaveTextContent("Main workspace");

    fireEvent.click(screen.getByRole("link", { name: "Timer" }));

    expect(onViewChange).toHaveBeenCalledWith("timer");
  });
});
