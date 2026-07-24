import {
  BarChart3,
  CalendarCheck,
  Clock3,
  Gauge,
  Settings,
  Trophy
} from "lucide-react";
import type { DashboardView } from "../../domain/navigation";
import { DASHBOARD_VIEWS, hashForView } from "../../domain/navigation";
import { useI18n } from "../../i18n/I18nProvider";

interface AppNavigationProps {
  activeView: DashboardView;
  onViewChange(view: DashboardView): void;
}

const icons = {
  overview: Gauge,
  checkin: CalendarCheck,
  timer: Clock3,
  progress: BarChart3,
  rewards: Trophy,
  settings: Settings
} satisfies Record<DashboardView, typeof Gauge>;

export function AppNavigation({ activeView, onViewChange }: AppNavigationProps) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t.navigation.regionLabel}
      className="glass-nav min-w-0 p-2"
      data-testid="dashboard-navigation"
    >
      <div className="hidden px-2 py-2 lg:block">
        <p className="text-xs font-semibold uppercase tracking-normal text-ielts-blue">
          IELTS
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">{t.navigation.consoleTitle}</p>
      </div>
      <div className="min-w-0 lg:mt-2">
        <div className="grid min-w-0 grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-1">
          {DASHBOARD_VIEWS.map((view) => {
            const Icon = icons[view];
            const isActive = view === activeView;

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={`nav-link ${isActive ? "nav-link--active" : ""}`}
                href={hashForView(view)}
                key={view}
                onClick={(event) => {
                  event.preventDefault();
                  onViewChange(view);
                }}
              >
                <Icon aria-hidden="true" size={17} strokeWidth={2.25} />
                <span>{t.navigation.viewLabel(view)}</span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
