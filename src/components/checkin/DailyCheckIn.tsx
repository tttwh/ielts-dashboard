import { Check } from "lucide-react";
import { IELTS_SECTIONS, SECTION_LABELS } from "../../domain/defaults";
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

interface PendingSectionProgress {
  id: string;
  label: string;
  actual: number;
  target: number;
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

const statusLabel = (label: string, progress: number | null) => {
  if (progress === null) return `${label} off`;
  return `${label} ${progress >= 1 ? "complete" : "incomplete"}`;
};

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
  const pendingSectionProgress: PendingSectionProgress[] = IELTS_SECTIONS.flatMap((section) => {
    const target = dailyGoals.sectionMinutesTarget[section];
    const actual = todayRecord.sectionMinutes[section];

    if (target <= 0 || actual >= target) return [];

    return [
      {
        id: section,
        label: SECTION_LABELS[section],
        actual,
        target
      }
    ];
  });

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
          const taskStatusLabel = statusLabel(task.label, progress);

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
                aria-disabled={progress === null ? "true" : undefined}
                aria-label={taskStatusLabel}
                className={`checkin-status-icon${isComplete ? " checkin-status-icon--complete" : ""}`}
              >
                {isComplete ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
              </span>
            </div>
          );
        })}
        {pendingSectionProgress.length > 0 ? (
          <div
            aria-live="polite"
            className="checkin-study-time-status"
            data-testid="checkin-study-time-status"
          >
            <span className="text-xs font-semibold uppercase tracking-normal text-muted">
              Study time targets pending
            </span>
            <div className="checkin-study-time-summary" aria-label="Pending study time progress">
              {pendingSectionProgress.map((section) => (
                <span key={section.id}>
                  {section.label} {section.actual}/{section.target} min
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
