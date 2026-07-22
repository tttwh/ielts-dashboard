import { Check } from "lucide-react";
import type { DailyGoals, DailyRecord } from "../../domain/types";
import type { DailyRecordUpdate } from "../../hooks/useDashboardData";
import { NumberField } from "../ui/NumberField";

type TaskField = "words" | "speakingTopics" | "listeningTests" | "corpusMinutes";

interface CheckInTask {
  id: string;
  field: TaskField;
  label: string;
  actual: number;
  target: number;
  suffix: string;
  max: number;
}

interface DailyCheckInProps {
  dailyGoals: DailyGoals;
  todayRecord: DailyRecord;
  updateTodayRecord(update: DailyRecordUpdate): void;
}

const taskUpdateFactories: Record<TaskField, (value: number) => DailyRecordUpdate> = {
  words: (words) => ({ words }),
  speakingTopics: (speakingTopics) => ({ speakingTopics }),
  listeningTests: (listeningTests) => ({ listeningTests }),
  corpusMinutes: (corpusMinutes) => ({ corpusMinutes })
};

const rowProgress = (actual: number, target: number) => {
  if (target <= 0) return null;
  return Math.min(Math.max(actual, 0) / target, 1);
};

const progressLabel = (progress: number | null) =>
  progress === null ? "Off" : `${Math.round(progress * 100)}%`;

export function DailyCheckIn({
  dailyGoals,
  todayRecord,
  updateTodayRecord
}: DailyCheckInProps) {
  const tasks: CheckInTask[] = [
    {
      id: "words",
      field: "words",
      label: "Words",
      actual: todayRecord.words,
      target: dailyGoals.wordsTarget,
      suffix: "words",
      max: 9999
    },
    {
      id: "speaking-topics",
      field: "speakingTopics",
      label: "Speaking topics",
      actual: todayRecord.speakingTopics,
      target: dailyGoals.speakingTopicsTarget,
      suffix: "topics",
      max: 99
    },
    {
      id: "listening-tests",
      field: "listeningTests",
      label: "Listening tests",
      actual: todayRecord.listeningTests,
      target: dailyGoals.listeningTestsTarget,
      suffix: "tests",
      max: 99
    },
    {
      id: "corpus-minutes",
      field: "corpusMinutes",
      label: "Corpus minutes",
      actual: todayRecord.corpusMinutes,
      target: dailyGoals.corpusMinutesTarget,
      suffix: "min",
      max: 1440
    }
  ];

  return (
    <section
      aria-label="Daily Check-In"
      className="min-w-0 rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="daily-checkin"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <h2 className="text-base font-semibold leading-6 text-ink">Daily Check-In</h2>
        {todayRecord.isAllClear ? (
          <span className="checkin-all-clear-badge" aria-live="polite">
            All Clear
          </span>
        ) : null}
      </div>

      <div className="divide-y divide-line">
        {tasks.map((task) => {
          const progress = rowProgress(task.actual, task.target);
          const isComplete = progress !== null && progress >= 1;
          const statusLabel = `${task.label} ${isComplete ? "complete" : "incomplete"}`;

          return (
            <div
              className="checkin-task-row"
              data-testid={`checkin-row-${task.id}`}
              key={task.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold leading-5 text-ink">{task.label}</h3>
              </div>

              <div className="checkin-task-input min-w-0">
                <NumberField
                  label={`${task.label} actual`}
                  max={task.max}
                  min={0}
                  onChange={(value) => updateTodayRecord(taskUpdateFactories[task.field](value))}
                  step={1}
                  suffix={task.suffix}
                  value={task.actual}
                />
              </div>

              <div className="checkin-task-target">
                <span className="text-xs font-medium uppercase tracking-normal text-muted">Target</span>
                <span className="font-mono text-sm font-semibold text-ink">{task.target}</span>
              </div>

              <div className="checkin-task-progress">
                <span className="font-mono text-sm font-semibold text-ielts-purple">
                  {progressLabel(progress)}
                </span>
              </div>

              <span
                aria-label={statusLabel}
                className={`checkin-status-icon${isComplete ? " checkin-status-icon--complete" : ""}`}
              >
                {isComplete ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
