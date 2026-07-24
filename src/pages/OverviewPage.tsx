import { ArrowRight, BarChart3, CalendarCheck, Clock3, Trophy } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { IELTS_SECTIONS } from "../domain/defaults";
import type { DashboardView } from "../domain/navigation";
import type {
  CompletionSummary,
  DailyGoals,
  DailyRecord,
  IeltsSection
} from "../domain/types";
import { useI18n } from "../i18n/I18nProvider";
import { formatMinutes, formatPercent } from "../lib/format";

interface OverviewPageProps {
  dailyGoals: DailyGoals;
  level: number;
  onViewChange(view: DashboardView): void;
  streakDays: number;
  summary: CompletionSummary;
  todayRecord: DailyRecord;
  xp: number;
}

const sectionTotal = (record: DailyRecord, section: IeltsSection) =>
  record.sectionMinutes[section];

export function OverviewPage({
  dailyGoals,
  level,
  onViewChange,
  streakDays,
  summary,
  todayRecord,
  xp
}: OverviewPageProps) {
  const { t } = useI18n();
  const totalMinutes = IELTS_SECTIONS.reduce(
    (total, section) => total + sectionTotal(todayRecord, section),
    0
  );
  const quickCards = [
    {
      detail: todayRecord.isAllClear ? t.checkIn.allClear : t.checkIn.studyTimePending,
      icon: CalendarCheck,
      id: "checkin" as const,
      label: t.overview.todayFocus,
      value: formatPercent(summary.completionRate)
    },
    {
      detail: t.timer.description,
      icon: Clock3,
      id: "timer" as const,
      label: t.timer.title,
      value: formatMinutes(totalMinutes)
    },
    {
      detail: t.navigation.viewDescription("progress"),
      icon: BarChart3,
      id: "progress" as const,
      label: t.overview.recentProgress,
      value: t.summary.streakDays(streakDays)
    },
    {
      detail: `${xp} ${t.units.xp}`,
      icon: Trophy,
      id: "rewards" as const,
      label: t.overview.rewardPreview,
      value: t.summary.levelValue(level)
    }
  ];

  return (
    <div className="page-stack">
      <PageHeader description={t.overview.description} title={t.overview.title} />
      <section
        className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4"
        aria-label={t.overview.title}
      >
        {quickCards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              className="glass-panel group min-h-[9rem] min-w-0 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-glass-hover focus:outline-none focus:ring-2 focus:ring-ielts-blue focus:ring-offset-2"
              key={card.id}
              onClick={() => onViewChange(card.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-grid h-9 w-9 place-items-center rounded-[8px] border border-blue-100 bg-blue-50 text-ielts-blue">
                  <Icon aria-hidden="true" size={18} strokeWidth={2.25} />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-muted transition group-hover:translate-x-0.5 group-hover:text-ielts-purple"
                  size={16}
                />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-muted">
                {card.label}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">{card.value}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{card.detail}</p>
            </button>
          );
        })}
      </section>
      <section className="glass-panel p-4" aria-label={t.overview.sectionBalance}>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-ink">{t.overview.sectionBalance}</h3>
          <Button onClick={() => onViewChange("timer")} variant="secondary">
            {t.overview.openView(t.navigation.viewLabel("timer"))}
          </Button>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {IELTS_SECTIONS.map((section) => {
            const actual = todayRecord.sectionMinutes[section];
            const target = dailyGoals.sectionMinutesTarget[section];
            const progress = target <= 0 ? 0 : Math.min(actual / target, 1);

            return (
              <div className="rounded-[8px] border border-white/70 bg-white/70 p-3" key={section}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{t.sections[section]}</span>
                  <span className="font-mono text-xs font-semibold text-ielts-purple">
                    {actual}/{target} {t.units.minutesShort}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ielts-blue to-ielts-purple"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
