import { useEffect, useId, useState } from "react";

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange(value: number): void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const decimalPlacesForStep = (step: number) => {
  const stepText = String(step);
  const decimalIndex = stepText.indexOf(".");

  return decimalIndex >= 0 ? stepText.length - decimalIndex - 1 : 0;
};

const formatValue = (value: number, step: number) => {
  const decimalPlaces = decimalPlacesForStep(step);

  return decimalPlaces > 0 ? value.toFixed(decimalPlaces) : String(value);
};

export function NumberField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange
}: NumberFieldProps) {
  const id = useId();
  const [draftValue, setDraftValue] = useState(() => formatValue(value, step));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(formatValue(value, step));
    }
  }, [isFocused, step, value]);

  const commitDraft = (nextValue: string) => {
    setDraftValue(nextValue);

    if (nextValue.trim() === "") {
      return;
    }

    const parsed = Number(nextValue);

    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed, min, max));
    }
  };

  const restoreOrClamp = () => {
    setIsFocused(false);

    if (draftValue.trim() === "") {
      setDraftValue(formatValue(value, step));
      return;
    }

    const parsed = Number(draftValue);

    if (!Number.isFinite(parsed)) {
      setDraftValue(formatValue(value, step));
      return;
    }

    const clampedValue = clamp(parsed, min, max);
    setDraftValue(formatValue(clampedValue, step));

    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };

  return (
    <div className="min-w-0">
      <label
        className="block truncate text-xs font-medium uppercase tracking-normal text-muted"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="mt-1 flex min-w-0 items-center rounded-[6px] border border-line bg-white shadow-sm focus-within:border-ielts-blue focus-within:ring-2 focus-within:ring-blue-100">
        <input
          className="h-9 min-w-0 flex-1 rounded-[6px] border-0 bg-transparent px-2 font-mono text-sm font-semibold text-ink outline-none"
          id={id}
          inputMode={step < 1 ? "decimal" : "numeric"}
          max={max}
          min={min}
          onBlur={restoreOrClamp}
          onChange={(event) => commitDraft(event.currentTarget.value)}
          onFocus={() => setIsFocused(true)}
          step={step}
          type="number"
          value={draftValue}
        />
        {suffix ? (
          <span aria-hidden="true" className="shrink-0 border-l border-line px-2 text-xs font-medium text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
