import type { ReactNode } from "react";
import type { DashboardView } from "../../domain/navigation";
import { AppNavigation } from "./AppNavigation";

interface AppShellProps {
  activeView: DashboardView;
  authSlot?: ReactNode;
  children: ReactNode;
  onViewChange(view: DashboardView): void;
  summary: ReactNode;
  syncStatusSlot?: ReactNode;
}

export function AppShell({
  activeView,
  authSlot,
  children,
  onViewChange,
  summary,
  syncStatusSlot
}: AppShellProps) {
  return (
    <div className="liquid-app min-h-dvh overflow-x-hidden text-ink">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-3 sm:px-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:py-5">
        <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
          <AppNavigation activeView={activeView} onViewChange={onViewChange} />
        </aside>
        <div className="grid min-w-0 gap-4">
          <header className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start">
            <div className="min-w-0">{summary}</div>
            {authSlot || syncStatusSlot ? (
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {syncStatusSlot}
                {authSlot}
              </div>
            ) : null}
          </header>
          <main className="min-w-0" data-testid={`page-${activeView}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
