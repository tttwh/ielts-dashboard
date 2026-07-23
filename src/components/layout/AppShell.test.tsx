import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithI18n } from "../../test/renderWithI18n";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("places the summary above a responsive main grid", () => {
    renderWithI18n(
      <AppShell summary={<div data-testid="summary">Summary</div>} sidebar={<div>Side rail</div>}>
        <div>Main workspace</div>
      </AppShell>
    );

    expect(screen.getByTestId("summary")).toBeVisible();
    expect(screen.getByRole("main")).toHaveTextContent("Main workspace");
    expect(screen.getByRole("complementary", { name: "Compact dashboard panels" })).toHaveTextContent(
      "Side rail"
    );
  });
});
