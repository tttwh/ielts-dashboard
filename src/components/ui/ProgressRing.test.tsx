import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("exposes clamped percentage progress to assistive tech", () => {
    render(<ProgressRing label="Today completion" value={1.4} />);

    const ring = screen.getByRole("progressbar", { name: "Today completion" });

    expect(ring).toHaveAttribute("aria-valuemin", "0");
    expect(ring).toHaveAttribute("aria-valuemax", "100");
    expect(ring).toHaveAttribute("aria-valuenow", "100");
  });
});
