import type { CompletionSummary } from "../../domain/types";
import type { AppState } from "../../services/storage/storageTypes";
import { formatBand, formatPercent } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { ProgressRing } from "../ui/ProgressRing";

interface SummaryHeaderProps {
  state: AppState;
  summary: CompletionSummary;
  streakDays: number;
  xp: number;
  level: number;
}

interface MetricProps {
  label: string;
  value: string;
  tone?: "blue" | "purple" | "neutral";
}

function Metric({ label, value, tone = "neutral" }: MetricProps) {
  const toneClass =
    tone === "blue"
      ? "text-ielts-blue"
      : tone === "purple"
        ? "text-ielts-purple"
        : "text-ink";

  return (
    <div className="min-w-0 px-0 py-1 sm:px-3">
      <p className="text-xs font-medium uppercase tracking-normal text-muted">{label}</p>
      <p className={`mt-1 break-words font-mono text-lg font-semibold leading-6 ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export function SummaryHeader({ state, summary, streakDays, xp, level }: SummaryHeaderProps) {
  const completionPercent = formatPercent(summary.completionRate);
  const streakLabel = `${streakDays} ${streakDays === 1 ? "day" : "days"}`;

  return (
    <section
      className="overflow-hidden rounded-[8px] border border-line bg-white shadow-sm"
      data-testid="summary-header"
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ProgressRing label="Today completion" value={summary.completionRate} />
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold leading-7 text-ink">IELTS Prep Dashboard</h1>
              <Badge tone="purple">Local mode · cloud-ready schema</Badge>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          <Metric label="Target band" value={formatBand(state.profile.targetBand)} tone="blue" />
          <Metric label="Today completion" value={completionPercent} tone="purple" />
          <Metric label="Streak" value={streakLabel} />
          <Metric label="XP" value={`${xp} XP`} tone="blue" />
          <Metric label="Level" value={`Level ${level}`} tone="purple" />
        </div>
      </div>
    </section>
  );
}
