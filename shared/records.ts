export const entities = ['todos', 'notes', 'calendars'] as const;
export type Entity = (typeof entities)[number];
export interface Change {
  entity: Entity;
  id: string;
  data: Record<string, unknown> | null;
  updated_at: string;
}
export const fields = {
  todos: [
    'id',
    'name',
    'description',
    'time_needed',
    'priority',
    'datetime',
    'status',
    'parent_id',
    'remind_me',
    'calendar_id',
    'created_at',
    'updated_at',
  ],
  notes: ['id', 'title', 'content', 'pinned', 'created_at', 'updated_at'],
  calendars: ['id', 'name', 'color', 'created_at', 'updated_at'],
} satisfies Record<Entity, string[]>;

export function validateChange(value: unknown): Change {
  const c = value as Change;
  if (
    !c ||
    !entities.includes(c.entity) ||
    typeof c.id !== 'string' ||
    !/^[\w-]{1,128}$/.test(c.id) ||
    !validDate(c.updated_at)
  )
    throw new Error('Invalid change');
  if (c.data !== null) {
    const d = c.data;
    if (
      !d ||
      typeof d !== 'object' ||
      Array.isArray(d) ||
      d.id !== c.id ||
      d.updated_at !== c.updated_at ||
      !validDate(d.created_at)
    )
      throw new Error('Invalid record');
    if (Object.keys(d).some((k) => !fields[c.entity].includes(k)))
      throw new Error('Unknown record field');
    if (c.entity === 'todos') {
      text(d.name, 500);
      text(d.description, 100000, true);
      if (
        !validDate(d.datetime) ||
        !['urgent', 'moderate', 'low', 'medium', 'high'].includes(String(d.priority)) ||
        !['pending', 'in_progress', 'completed', 'cancelled'].includes(String(d.status))
      )
        throw new Error('Invalid task');
      if (d.time_needed != null && (!Number.isInteger(d.time_needed) || Number(d.time_needed) < 0))
        throw new Error('Invalid duration');
      flag(d.remind_me);
      if (d.parent_id != null) text(d.parent_id, 128);
      if (d.calendar_id != null) text(d.calendar_id, 128);
    } else if (c.entity === 'notes') {
      text(d.title, 500);
      if (typeof d.content !== 'string') throw new Error('Invalid note content');
      text(d.content, 100000, true);
      flag(d.pinned);
    } else {
      text(d.name, 100);
      if (typeof d.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(d.color))
        throw new Error('Invalid calendar color');
    }
  }
  return c;
}
function validDate(v: unknown) {
  return typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
}
function text(v: unknown, max: number, optional = false) {
  if (optional && v == null) return;
  if (typeof v !== 'string' || v.length > max || (!optional && !v.trim()))
    throw new Error('Invalid text');
}
function flag(v: unknown) {
  if (![true, false, 0, 1].includes(v as boolean)) throw new Error('Invalid boolean');
}
