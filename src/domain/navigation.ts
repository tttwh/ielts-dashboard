export const DASHBOARD_VIEWS = [
  "overview",
  "checkin",
  "timer",
  "progress",
  "rewards",
  "settings"
] as const;

export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const PRIMARY_MOBILE_VIEWS: readonly DashboardView[] = [
  "overview",
  "checkin",
  "timer",
  "progress",
  "rewards"
];

export const SETTINGS_VIEW: DashboardView = "settings";

const viewSet = new Set<string>(DASHBOARD_VIEWS);

export function normalizeDashboardView(value: string | null | undefined): DashboardView {
  return value && viewSet.has(value) ? (value as DashboardView) : "overview";
}

export function viewFromHash(hash: string): DashboardView {
  const normalizedHash = hash.replace(/^#\/?/, "").trim();
  return normalizeDashboardView(normalizedHash);
}

export function hashForView(view: DashboardView): string {
  return `#${view}`;
}
