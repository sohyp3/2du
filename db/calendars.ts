import { db, withDatabaseWrite } from './database';
export interface Calendar {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}
export async function getCalendars() {
  return db.getAllAsync<Calendar>('SELECT * FROM calendars ORDER BY created_at, name');
}
async function saveCalendarLocal(calendar: Calendar) {
  if (
    !calendar.name.trim() ||
    calendar.name.length > 100 ||
    !/^#[0-9a-f]{6}$/i.test(calendar.color)
  )
    throw new Error('Use a name and a six-digit hex color.');
  await db.runAsync(
    'INSERT OR REPLACE INTO calendars (id,name,color,created_at,updated_at) VALUES(?,?,?,?,?)',
    calendar.id,
    calendar.name.trim(),
    calendar.color,
    calendar.created_at,
    calendar.updated_at
  );
}
async function removeCalendarLocal(id: string) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM todos WHERE calendar_id=?',
    id
  );
  if (row?.count) throw new Error('Move tasks out of this calendar before deleting it.');
  if (id === 'daily') throw new Error('The default calendar cannot be deleted.');
  await db.runAsync('DELETE FROM calendars WHERE id=?', id);
}

export const saveCalendar: typeof saveCalendarLocal = (...args) =>
  withDatabaseWrite(() => saveCalendarLocal(...args));

export const removeCalendar: typeof removeCalendarLocal = (...args) =>
  withDatabaseWrite(() => removeCalendarLocal(...args));
