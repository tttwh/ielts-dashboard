import { Pause, Play, RotateCw, Save, Square } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { IELTS_SECTIONS } from "../../domain/defaults";
import type { DailyGoals, IeltsSection, TimerSession } from "../../domain/types";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../ui/Button";
import { selectInputClassName, timerMinuteInputClassName } from "../ui/inputStyles";

interface StudyTimerPanelProps {
  dailyGoals: DailyGoals;
  today: string;
  userId: string;
  addTimerSession(session: TimerSession): void;
}

const plannedMinutesForSection = (section: IeltsSection, dailyGoals: DailyGoals) =>
  section === "reading" ? 60 : dailyGoals.sectionMinutesTarget[section];

const formatTimer = (elapsedSeconds: number) => {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const recordedMinutesFromSeconds = (elapsedSeconds: number) =>
  elapsedSeconds <= 0 ? 0 : Math.ceil(elapsedSeconds / 60);

const createSessionId = () => {
  if (globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  return `timer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function StudyTimerPanel({
  dailyGoals,
  today,
  userId,
  addTimerSession
}: StudyTimerPanelProps) {
  const { t } = useI18n();
  const [selectedSection, setSelectedSection] = useState<IeltsSection>("reading");
  const [manualSection, setManualSection] = useState<IeltsSection>("reading");
  const [manualMinutes, setManualMinutes] = useState("30");
  const [activeStartedAt, setActiveStartedAt] = useState<string | null>(null);
  const plannedMinutes = plannedMinutesForSection(selectedSection, dailyGoals);
  const timer = useStudyTimer({ section: selectedSection, plannedMinutes });
  const sectionSwitchLocked = timer.status === "running" || timer.status === "paused";
  const timerCanFinish = timer.status === "running" || timer.status === "paused";
  const recordedTimerMinutes = recordedMinutesFromSeconds(timer.elapsedSeconds);
  const showReadingOvertime = selectedSection === "reading" && timer.overtimeSeconds > 0;
  const overtimeMinutes = Math.ceil(timer.overtimeSeconds / 60);
  const selectedSectionLabel = t.sections[selectedSection];
  const statusLabel = t.timer.status[timer.status];

  const buildSession = (
    section: IeltsSection,
    source: TimerSession["source"],
    actualMinutes: number,
    planned: number,
    startedAt: string,
    endedAt: string
  ): TimerSession => ({
    sessionId: createSessionId(),
    userId,
    date: today,
    section,
    source,
    plannedMinutes: planned,
    actualMinutes,
    overtimeMinutes: Math.max(0, actualMinutes - planned),
    startedAt,
    endedAt,
    createdAt: endedAt,
    updatedAt: endedAt,
    deletedAt: null,
    syncStatus: "local-only"
  });

  const handleStart = () => {
    setActiveStartedAt(new Date().toISOString());
    timer.start();
  };

  const handleFinish = () => {
    const endedAt = new Date().toISOString();
    const result = timer.finish();

    if (result.actualMinutes > 0) {
      addTimerSession(
        buildSession(
          selectedSection,
          "in-app-timer",
          result.actualMinutes,
          plannedMinutes,
          activeStartedAt ?? endedAt,
          endedAt
        )
      );
    }

    setActiveStartedAt(null);
  };

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedMinutes = Number(manualMinutes);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      return;
    }

    const actualMinutes = Math.min(Math.round(parsedMinutes), 1440);
    const planned = plannedMinutesForSection(manualSection, dailyGoals);
    const endedAt = new Date().toISOString();
    const startedAt = new Date(Date.now() - actualMinutes * 60 * 1000).toISOString();

    addTimerSession(
      buildSession(manualSection, "manual-external", actualMinutes, planned, startedAt, endedAt)
    );
    setManualMinutes("");
  };

  return (
    <section
      aria-label={t.timer.regionLabel}
      className="glass-panel min-w-0"
      data-testid="study-timer-panel"
    >
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/70 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-ink">{t.timer.title}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">{t.timer.description}</p>
        </div>
        <div className="inline-flex min-h-9 items-center rounded-[6px] border border-white/75 bg-white/60 px-3 font-mono text-xs font-semibold uppercase tracking-normal text-ink shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
          {statusLabel}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <div
            className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-label={t.timer.sectionGroupLabel}
          >
            {IELTS_SECTIONS.map((section) => {
              const isSelected = section === selectedSection;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`min-h-11 min-w-0 rounded-[6px] border px-2 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-ielts-blue bg-ielts-blue text-white shadow-[0_10px_26px_-18px_rgba(40,85,217,0.8)]"
                      : "border-white/75 bg-white/58 text-ink hover:border-blue-200 hover:bg-white/84"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={sectionSwitchLocked}
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  type="button"
                >
                  {t.sections[section]}
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-w-0">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">{selectedSectionLabel}</span>
              <span className="font-mono text-xs font-semibold text-muted">
                {t.timer.plannedMinutes(plannedMinutes)}
              </span>
            </div>
            <div className="mt-3 font-mono text-[2.75rem] font-bold leading-none text-ink sm:text-6xl">
              {formatTimer(timer.elapsedSeconds)}
            </div>
            <div className="mt-3 min-h-5" aria-live="polite">
              {showReadingOvertime ? (
                <p className="font-mono text-sm font-semibold text-red-600">
                  {t.timer.overtime(overtimeMinutes)}
                </p>
              ) : (
                <p className="text-sm text-muted">
                  {t.timer.readyToRecord(recordedTimerMinutes)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap gap-2">
            {timer.status === "idle" || timer.status === "finished" ? (
              <Button className="h-11 px-4" onClick={handleStart} variant="primary">
                <Play aria-hidden="true" className="mr-2" size={16} />
                {t.timer.buttons.start}
              </Button>
            ) : null}
            {timer.status === "running" ? (
              <Button className="h-11 px-4" onClick={timer.pause}>
                <Pause aria-hidden="true" className="mr-2" size={16} />
                {t.timer.buttons.pause}
              </Button>
            ) : null}
            {timer.status === "paused" ? (
              <Button className="h-11 px-4" onClick={timer.resume}>
                <RotateCw aria-hidden="true" className="mr-2" size={16} />
                {t.timer.buttons.resume}
              </Button>
            ) : null}
            {timerCanFinish ? (
              <Button
                className="h-11 px-4"
                disabled={timer.elapsedSeconds <= 0}
                onClick={handleFinish}
              >
                <Square aria-hidden="true" className="mr-2" size={16} />
                {t.timer.buttons.endAndRecord}
              </Button>
            ) : null}
          </div>
        </div>

        <form
          className="min-w-0 border-t border-white/70 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0"
          data-testid="manual-external-time-form"
          onSubmit={handleManualSubmit}
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{t.timer.manualEntry}</h3>
            <span className="rounded-[6px] border border-white/75 bg-white/58 px-2 py-1 text-xs font-semibold text-muted">
              {t.timer.manualExternalTime}
            </span>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)]">
            <label className="min-w-0">
              <span className="block truncate text-xs font-medium uppercase tracking-normal text-muted">
                {t.timer.manualSection}
              </span>
              <select
                className={selectInputClassName}
                onChange={(event) => setManualSection(event.currentTarget.value as IeltsSection)}
                value={manualSection}
              >
                {IELTS_SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {t.sections[section]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 max-w-[7rem]">
              <span className="block truncate text-xs font-medium uppercase tracking-normal text-muted">
                {t.timer.manualMinutes}
              </span>
              <input
                className={timerMinuteInputClassName}
                inputMode="numeric"
                max={1440}
                min={1}
                onChange={(event) => setManualMinutes(event.currentTarget.value)}
                step={1}
                type="number"
                value={manualMinutes}
              />
            </label>
          </div>

          <Button className="mt-3 h-11 w-full px-4 sm:w-auto" type="submit" variant="primary">
            <Save aria-hidden="true" className="mr-2" size={16} />
            {t.timer.buttons.recordExternalTime}
          </Button>
        </form>
      </div>
    </section>
  );
}
