import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NumberField } from "./NumberField";

describe("NumberField", () => {
  it("clamps values below the minimum and above the maximum", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <NumberField label="Target band" max={9} min={0} onChange={handleChange} step={0.5} value={7} />
    );

    const input = screen.getByLabelText("Target band");

    await user.clear(input);
    await user.type(input, "-1");
    expect(handleChange).toHaveBeenLastCalledWith(0);

    await user.clear(input);
    await user.type(input, "10");
    expect(handleChange).toHaveBeenLastCalledWith(9);
  });

  it("keeps the previous valid value while a focused input is blank", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <NumberField label="Words" max={999} min={0} onChange={handleChange} step={10} value={100} />
    );

    const input = screen.getByLabelText("Words");

    await user.clear(input);

    expect(input).toHaveValue(null);
    expect(handleChange).not.toHaveBeenCalled();

    await user.tab();

    expect(input).toHaveValue(100);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("normalizes manually typed band scores to the nearest valid step", async () => {
    const user = userEvent.setup();

    function ControlledBandField() {
      const [value, setValue] = useState(7);

      return (
        <NumberField label="Target band" max={9} min={0} onChange={setValue} step={0.5} value={value} />
      );
    }

    render(<ControlledBandField />);

    const input = screen.getByLabelText("Target band");

    await user.clear(input);
    await user.type(input, "7.3");
    await user.tab();

    expect(input).toHaveDisplayValue("7.5");
  });

  it("normalizes manually typed whole-number goals to the nearest valid step", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <NumberField label="Words" max={999} min={0} onChange={handleChange} step={10} value={200} />
    );

    const input = screen.getByLabelText("Words");

    await user.clear(input);
    await user.type(input, "205");

    expect(handleChange).toHaveBeenLastCalledWith(210);
  });

  it("renders an optional suffix without changing the accessible input label", () => {
    render(
      <NumberField label="Corpus" max={600} min={0} onChange={() => undefined} step={5} suffix="min" value={30} />
    );

    expect(screen.getByLabelText("Corpus")).toHaveValue(30);
    expect(screen.getByText("min")).toBeVisible();
  });
});
