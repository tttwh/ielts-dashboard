import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  summary: ReactNode;
  sidebar?: ReactNode;
}

export function AppShell({ children, summary, sidebar }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header>{summary}</header>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0">{children}</main>
          {sidebar ? (
            <aside aria-label="Compact dashboard panels" className="min-w-0">
              {sidebar}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
