import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCurrentDateKey } from "./useCurrentDateKey";

describe("useCurrentDateKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the local date key at midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 22, 23, 59, 59, 900));

    const { result } = renderHook(() => useCurrentDateKey());

    expect(result.current).toBe("2026-07-22");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("2026-07-23");
  });
});
