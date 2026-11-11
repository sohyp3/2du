export interface BookingLink {
  slug: string;
  title: string;
  duration_min: number;
  days: number[];
  start: string;
  end: string;
  tz: string;
  buffer_min: number;
  notice_min: number;
  horizon_days: number;
  calendar_id: string;
  enabled: boolean;
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function defaultLink(tz: string, calendarId: string): BookingLink {
  return {
    slug: '',
    title: 'Meeting',
    duration_min: 30,
    days: [0, 1, 2, 3, 4],
    start: '09:00',
    end: '17:00',
    tz,
    buffer_min: 0,
    notice_min: 120,
    horizon_days: 14,
    calendar_id: calendarId,
    enabled: true,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function linkErrors(link: BookingLink): string[] {
  const errors: string[] = [];
  if (link.slug.length < 3 || !SLUG_PATTERN.test(link.slug))
    errors.push(
      'Link name needs 3 to 40 lowercase letters, digits or dashes, not starting or ending with a dash.'
    );
  if (!link.title.trim()) errors.push('Add a title.');
  if (!link.days.length) errors.push('Pick at least one day.');
  if (link.end <= link.start) errors.push('The end time must be after the start time.');
  return errors;
}
