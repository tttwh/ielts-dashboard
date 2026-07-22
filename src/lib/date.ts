const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const padDatePart = (value: number) => value.toString().padStart(2, "0");

const formatDateKey = (date: Date) =>
  `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;

const parseDateKey = (dateKey: string) => {
  const match = DATE_KEY_PATTERN.exec(dateKey);

  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return date;
};

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

export function addDays(dateKey: string, delta: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatDateKey(date);
}

export function lastNDays(today: string, count: number): string[] {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1));
}
