import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IeltsSection } from "../domain/types";

export type StudyTimerStatus = "idle" | "running" | "paused" | "finished";

export interface StudyTimerOptions {
  section: IeltsSection;
  plannedMinutes: number;
}

export interface TimerResult {
  actualMinutes: number;
  overtimeMinutes: number;
}

export interface StudyTimerState {
  status: StudyTimerStatus;
  elapsedSeconds: number;
  overtimeSeconds: number;
  start(): void;
  pause(): void;
  resume(): void;
  finish(): TimerResult;
}

const secondsToRecordedMinutes = (seconds: number) =>
  seconds <= 0 ? 0 : Math.ceil(seconds / 60);

const calculateOvertimeSeconds = (elapsedSeconds: number, plannedMinutes: number) =>
  Math.max(0, elapsedSeconds - Math.max(0, plannedMinutes) * 60);

export function useStudyTimer({ section, plannedMinutes }: StudyTimerOptions): StudyTimerState {
  const [status, setStatus] = useState<StudyTimerStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const statusRef = useRef<StudyTimerStatus>("idle");
  const elapsedSecondsRef = useRef(0);
  const runningBaseSecondsRef = useRef(0);
  const runningStartedAtMsRef = useRef<number | null>(null);

  const setElapsed = useCallback((seconds: number) => {
    const nextSeconds = Math.max(0, seconds);
    elapsedSecondsRef.current = nextSeconds;
    setElapsedSeconds(nextSeconds);
  }, []);

  const setTimerStatus = useCallback((nextStatus: StudyTimerStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const syncRunningElapsed = useCallback(() => {
    if (statusRef.current !== "running" || runningStartedAtMsRef.current === null) {
      return elapsedSecondsRef.current;
    }

    const activeRunSeconds = Math.floor((Date.now() - runningStartedAtMsRef.current) / 1000);
    const nextSeconds = runningBaseSecondsRef.current + activeRunSeconds;
    setElapsed(nextSeconds);

    return nextSeconds;
  }, [setElapsed]);

  useEffect(() => {
    if (status !== "running") {
      return undefined;
    }

    const intervalId = window.setInterval(syncRunningElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [status, syncRunningElapsed]);

  useEffect(() => {
    if (statusRef.current === "running" || statusRef.current === "paused") {
      return;
    }

    runningBaseSecondsRef.current = 0;
    runningStartedAtMsRef.current = null;
    setElapsed(0);
    setTimerStatus("idle");
  }, [plannedMinutes, section, setElapsed, setTimerStatus]);

  const start = useCallback(() => {
    if (statusRef.current === "running") {
      return;
    }

    runningBaseSecondsRef.current = 0;
    runningStartedAtMsRef.current = Date.now();
    setElapsed(0);
    setTimerStatus("running");
  }, [setElapsed, setTimerStatus]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") {
      return;
    }

    const pausedAtSeconds = syncRunningElapsed();
    runningBaseSecondsRef.current = pausedAtSeconds;
    runningStartedAtMsRef.current = null;
    setTimerStatus("paused");
  }, [setTimerStatus, syncRunningElapsed]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") {
      return;
    }

    runningBaseSecondsRef.current = elapsedSecondsRef.current;
    runningStartedAtMsRef.current = Date.now();
    setTimerStatus("running");
  }, [setTimerStatus]);

  const finish = useCallback(() => {
    const finishedSeconds =
      statusRef.current === "running" ? syncRunningElapsed() : elapsedSecondsRef.current;
    const actualMinutes = secondsToRecordedMinutes(finishedSeconds);
    const overtimeMinutes = Math.max(0, actualMinutes - Math.max(0, plannedMinutes));

    runningBaseSecondsRef.current = finishedSeconds;
    runningStartedAtMsRef.current = null;
    setTimerStatus("finished");

    return {
      actualMinutes,
      overtimeMinutes
    };
  }, [plannedMinutes, setTimerStatus, syncRunningElapsed]);

  const overtimeSeconds = useMemo(
    () => calculateOvertimeSeconds(elapsedSeconds, plannedMinutes),
    [elapsedSeconds, plannedMinutes]
  );

  return {
    status,
    elapsedSeconds,
    overtimeSeconds,
    start,
    pause,
    resume,
    finish
  };
}
