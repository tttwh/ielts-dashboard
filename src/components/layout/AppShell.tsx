import type { ReactNode } from "react";
import type { DashboardView } from "../../domain/navigation";
import { AppNavigation } from "./AppNavigation";

interface AppShellProps {
  activeView: DashboardView;
  children: ReactNode;
  onViewChange(view: DashboardView): void;
  summary: ReactNode;
}

export function AppShell({ activeView, children, onViewChange, summary }: AppShellProps) {
  return (
    <div className="liquid-app min-h-dvh overflow-x-hidden text-ink">
      <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3 py-3 sm:px-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:py-5">
        <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start">
          <AppNavigation activeView={activeView} onViewChange={onViewChange} />
        </aside>
        <div className="grid min-w-0 gap-4">
          <header>{summary}</header>
          <main className="min-w-0" data-testid={`page-${activeView}`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
