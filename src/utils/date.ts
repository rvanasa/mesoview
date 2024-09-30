export default function zeroPad(value: number, digits: number): string {
  return String(value).padStart(digits, '0');
}

export function roundToNearestHour(date: Date) {
  date = new Date(date);
  date.setUTCHours(date.getUTCHours() + Math.round(date.getUTCMinutes() / 60));
  date.setUTCMinutes(0, 0, 0);
  return date;
}

export function plusHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + 3600000 * hours);
}

export function formatDate(date: Date): string {
  return `${date.toISOString().slice(0, 10)} ${zeroPad(
    date.getUTCHours(),
    2,
  )}z`;
}

export function parseDate(dateString: string, defaultHour: number): Date;
export function parseDate(dateString: string): Date | undefined;
export function parseDate(
  dateString: string,
  defaultHour?: number,
): Date | undefined {
  const [date, time] = dateString.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const hour = parseInt(time, 10);
  if (isNaN(hour) && arguments.length < 2) {
    return;
  }
  return new Date(
    Date.UTC(year, month - 1, day, isNaN(hour) ? defaultHour : hour),
  );
}
