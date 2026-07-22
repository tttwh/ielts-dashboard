import { useMemo, useState } from "react";
import { buildHeatmapDays } from "../../domain/progress";
import type { DailyRecord, HeatmapDay } from "../../domain/types";
import { formatPercent } from "../../lib/format";

interface Heatmap60Props {
  records: DailyRecord[];
  today: string;
}

interface HistoryMetricProps {
  label: string;
  value: string;
}

const levelClasses: Record<HeatmapDay["level"], string> = {
  0: "border-[#dbe3ef] bg-[#eef2f7]",
  1: "border-blue-200 bg-blue-200",
  2: "border-blue-300 bg-blue-400",
  3: "border-violet-400 bg-violet-600",
  4: "border-violet-900 bg-violet-950"
};

const historyWindowDays = 60;

const dayLabel = (day: HeatmapDay) => `${day.date}, ${formatPercent(day.completionRate)} complete`;

function HistoryMetric({ label, value }: HistoryMetricProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export function Heatmap60({ records, today }: Heatmap60Props) {
  const days = useMemo(
    () => buildHeatmapDays(records, today, historyWindowDays),
    [records, today]
  );
  const [activeDate, setActiveDate] = useState(() => today);
  const displayDay = days.find((day) => day.date === activeDate) ?? days[days.length - 1];
  const activeDays = days.filter((day) => day.completionRate > 0).length;
  const averageCompletion =
    days.length === 0
      ? 0
      : days.reduce((total, day) => total + day.completionRate, 0) / days.length;
  const bestCompletion = days.reduce(
    (best, day) => Math.max(best, day.completionRate),
    0
  );
  const allClearDays = days.filter((day) => day.isAllClear).length;

  return (
    <section
      aria-labelledby="history-summary-heading"
      className="min-w-0 overflow-hidden rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="history-heatmap"
    >
      <div className="flex min-w-0 flex-col gap-3 border-b border-line p-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 id="history-summary-heading" className="text-base font-semibold leading-6 text-ink">
            History Summary
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">Latest 60 local study days.</p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <HistoryMetric label="Active" value={`${activeDays}/60`} />
          <HistoryMetric label="Average" value={formatPercent(averageCompletion)} />
          <HistoryMetric label="Best" value={formatPercent(bestCompletion)} />
          <HistoryMetric label="100% days" value={`${allClearDays}`} />
        </div>
      </div>

      <div className="min-w-0 p-4">
        <div
          aria-label="60-day completion heatmap"
          className="min-w-0 overflow-x-auto overscroll-x-contain pb-1"
          data-testid="heatmap-strip"
        >
          <div className="grid min-w-max grid-flow-col grid-rows-7 gap-[3px] [grid-auto-columns:1rem]">
            {days.map((day) => (
              <button
                aria-label={dayLabel(day)}
                className={`h-4 w-4 rounded-[3px] border transition-transform focus:outline-none focus:ring-2 focus:ring-ielts-blue focus:ring-offset-1 hover:scale-110 ${levelClasses[day.level]}`}
                data-date={day.date}
                data-level={day.level}
                key={day.date}
                onFocus={() => setActiveDate(day.date)}
                onMouseEnter={() => setActiveDate(day.date)}
                title={dayLabel(day)}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            aria-live="polite"
            className="min-w-0 font-mono text-xs font-semibold text-ink"
            data-testid="heatmap-day-detail"
          >
            {displayDay.date} - {formatPercent(displayDay.completionRate)} complete
          </p>
          <div
            aria-label="Heatmap legend from 0 percent to 100 percent"
            className="flex shrink-0 items-center gap-1.5"
            data-testid="heatmap-legend"
          >
            <span className="font-mono text-xs font-semibold text-muted">0%</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                aria-hidden="true"
                className={`h-3.5 w-3.5 rounded-[3px] border ${levelClasses[level]}`}
                key={level}
              />
            ))}
            <span className="font-mono text-xs font-semibold text-muted">100%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
