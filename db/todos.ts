import { db } from './database';

export type Priority = 'urgent' | 'moderate' | 'low';
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type StatusFilter = 'active' | 'completed' | 'all';

export interface Todo {
  id: string;
  name: string;
  description: string | null;
  time_needed: number | null;
  priority: Priority;
  datetime: string;
  status: TodoStatus;
  parent_id: string | null;
  remind_me: boolean;
  created_at: string;
  updated_at: string;
}

interface TodoRow {
  id: string;
  name: string;
  description: string | null;
  time_needed: number | null;
  priority: string;
  datetime: string;
  status: string;
  parent_id: string | null;
  remind_me: number;
  created_at: string;
  updated_at: string;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    ...row,
    priority: row.priority as Priority,
    status: row.status as TodoStatus,
    remind_me: row.remind_me === 1,
  };
}

export function getTodosByDateRange(
  startISO: string,
  endISO: string,
  statusFilter: StatusFilter = 'all'
): Todo[] {
  let query = 'SELECT * FROM todos WHERE datetime BETWEEN ? AND ?';
  const params: (string | number)[] = [startISO, endISO];

  if (statusFilter === 'active') {
    query += " AND status != 'completed'";
  } else if (statusFilter === 'completed') {
    query += " AND status = 'completed'";
  }

  query += ' ORDER BY datetime ASC';
  return db.getAllSync<TodoRow>(query, ...params).map(rowToTodo);
}

export function getTodoById(id: string): Todo | null {
  const row = db.getFirstSync<TodoRow>('SELECT * FROM todos WHERE id = ?', id);
  return row ? rowToTodo(row) : null;
}

export function insertTodo(todo: Todo): void {
  db.runSync(
    `INSERT INTO todos (id, name, description, time_needed, priority, datetime, status, parent_id, remind_me, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    todo.id,
    todo.name,
    todo.description,
    todo.time_needed,
    todo.priority,
    todo.datetime,
    todo.status,
    todo.parent_id,
    todo.remind_me ? 1 : 0,
    todo.created_at,
    todo.updated_at
  );
}

export function updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'created_at'>>): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.time_needed !== undefined) {
    fields.push('time_needed = ?');
    values.push(updates.time_needed);
  }
  if (updates.priority !== undefined) {
    fields.push('priority = ?');
    values.push(updates.priority);
  }
  if (updates.datetime !== undefined) {
    fields.push('datetime = ?');
    values.push(updates.datetime);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.parent_id !== undefined) {
    fields.push('parent_id = ?');
    values.push(updates.parent_id);
  }
  if (updates.remind_me !== undefined) {
    fields.push('remind_me = ?');
    values.push(updates.remind_me ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.runSync(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export function getTodoCountsByMonth(year: number, month: number): Record<string, number> {
  const start = new Date(year, month, 1).toISOString();
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
  const rows = db.getAllSync<{ day: string; count: number }>(
    `SELECT substr(datetime, 1, 10) as day, COUNT(*) as count FROM todos WHERE datetime BETWEEN ? AND ? AND status != 'cancelled' GROUP BY day`,
    start,
    end
  );
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.day] = row.count;
  }
  return result;
}

export function deleteTodo(id: string): void {
  db.runSync(`DELETE FROM todos WHERE id = ?`, id);
}
