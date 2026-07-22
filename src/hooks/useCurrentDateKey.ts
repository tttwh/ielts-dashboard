import { useEffect, useState } from "react";
import { todayKey } from "../lib/date";

const millisecondsUntilNextLocalMidnight = () => {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return Math.max(1, nextMidnight.getTime() - now.getTime());
};

export function useCurrentDateKey(): string {
  const [currentDateKey, setCurrentDateKey] = useState(() => todayKey());

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextRollover = () => {
      timeoutId = window.setTimeout(() => {
        setCurrentDateKey(todayKey());
        scheduleNextRollover();
      }, millisecondsUntilNextLocalMidnight());
    };

    scheduleNextRollover();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return currentDateKey;
}
