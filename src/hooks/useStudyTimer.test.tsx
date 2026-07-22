import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStudyTimer } from "./useStudyTimer";

describe("useStudyTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks reading overtime after 60 minutes", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useStudyTimer({ section: "reading", plannedMinutes: 60 })
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(90 * 60 * 1000));

    expect(result.current.elapsedSeconds).toBe(5400);
    expect(result.current.overtimeSeconds).toBe(1800);
  });

  it("pauses and resumes without counting paused time", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useStudyTimer({ section: "listening", plannedMinutes: 45 })
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5 * 60 * 1000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(2 * 60 * 1000));

    expect(result.current.status).toBe("running");
    expect(result.current.elapsedSeconds).toBe(7 * 60);
    expect(result.current.overtimeSeconds).toBe(0);
  });

  it("finishes with rounded actual and overtime minutes", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useStudyTimer({ section: "reading", plannedMinutes: 60 })
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(61 * 60 * 1000 + 1000));

    let timerResult: ReturnType<typeof result.current.finish> | undefined;
    act(() => {
      timerResult = result.current.finish();
    });
    act(() => vi.advanceTimersByTime(5 * 60 * 1000));

    expect(timerResult).toEqual({
      actualMinutes: 62,
      overtimeMinutes: 2
    });
    expect(result.current.status).toBe("finished");
    expect(result.current.elapsedSeconds).toBe(61 * 60 + 1);
  });
});
