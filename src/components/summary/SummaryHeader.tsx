import type { CompletionSummary } from "../../domain/types";
import type { AppState } from "../../services/storage/storageTypes";
import { formatBand, formatPercent } from "../../lib/format";
import { useI18n } from "../../i18n/I18nProvider";
import { LanguageToggle } from "../language/LanguageToggle";
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
  const { t } = useI18n();
  const completionPercent = formatPercent(summary.completionRate);
  const streakLabel = t.summary.streakDays(streakDays);

  return (
    <section
      className="glass-panel overflow-hidden"
      data-testid="summary-header"
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ProgressRing label={t.summary.todayCompletion} value={summary.completionRate} />
          <div className="min-w-0">
            <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold leading-7 text-ink">
                {t.summary.dashboardTitle}
              </h1>
              <Badge tone="purple">{t.summary.localMode}</Badge>
              <LanguageToggle />
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
          <Metric label={t.summary.targetBand} value={formatBand(state.profile.targetBand)} tone="blue" />
          <Metric label={t.summary.todayCompletion} value={completionPercent} tone="purple" />
          <Metric label={t.summary.streak} value={streakLabel} />
          <Metric label={t.summary.xp} value={`${xp} ${t.units.xp}`} tone="blue" />
          <Metric label={t.summary.levelLabel} value={t.summary.levelValue(level)} tone="purple" />
        </div>
      </div>
    </section>
  );
}
