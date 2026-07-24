import type { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="glass-panel flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-normal text-ielts-blue">
          {t.navigation.consoleTitle}
        </p>
        <h2 className="mt-1 text-xl font-semibold leading-7 text-ink">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-muted">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
