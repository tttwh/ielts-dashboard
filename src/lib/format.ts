export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatMinutes(minutes: number): string {
  const roundedMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatBand(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
