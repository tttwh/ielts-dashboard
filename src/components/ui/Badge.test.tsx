import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders compact tone styling with the supplied label", () => {
    render(<Badge tone="blue">Local mode</Badge>);

    const badge = screen.getByText("Local mode");

    expect(badge).toBeVisible();
    expect(badge).toHaveClass("rounded-full", "border", "text-ielts-blue");
  });
});
