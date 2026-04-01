export type FilterPeriod = 'day' | 'week' | 'month';

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getDateRange(period: FilterPeriod, date: Date): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return { start: getStartOfDay(date), end: getEndOfDay(date) };
    case 'week':
      return { start: getStartOfWeek(date), end: getEndOfWeek(date) };
    case 'month':
      return { start: getStartOfMonth(date), end: getEndOfMonth(date) };
  }
}

export function shiftDate(period: FilterPeriod, date: Date, direction: 'prev' | 'next'): Date {
  const d = new Date(date);
  const offset = direction === 'next' ? 1 : -1;
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + offset);
      break;
    case 'week':
      d.setDate(d.getDate() + offset * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + offset);
      break;
  }
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameWeek(a: Date, b: Date): boolean {
  return getStartOfWeek(a).getTime() === getStartOfWeek(b).getTime();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function getFilterLabel(period: FilterPeriod, date: Date): string {
  const today = new Date();
  switch (period) {
    case 'day': {
      if (isSameDay(date, today)) return 'Today';
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      if (isSameDay(date, yesterday)) return 'Yesterday';
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      if (isSameDay(date, tomorrow)) return 'Tomorrow';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    case 'week': {
      if (isSameWeek(date, today)) return 'This Week';
      const { start, end } = getDateRange('week', date);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    case 'month': {
      if (isSameMonth(date, today)) return 'This Month';
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
