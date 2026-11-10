import { db, withDatabaseWrite } from './database';
import { validateChange } from '../shared/records';

export type GoalStatus = 'active' | 'paused' | 'done';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  importance: number;
  weekly_target: number | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export async function getGoals(): Promise<Goal[]> {
  return db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY importance DESC, name');
}

async function saveGoalLocal(goal: Goal) {
  validateChange({ entity: 'goals', id: goal.id, data: { ...goal }, updated_at: goal.updated_at });
  await db.runAsync(
    'INSERT OR REPLACE INTO goals (id,name,description,importance,weekly_target,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
    goal.id,
    goal.name.trim(),
    goal.description ?? null,
    goal.importance,
    goal.weekly_target ?? null,
    goal.status,
    goal.created_at,
    goal.updated_at
  );
}

async function removeGoalLocal(id: string) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    // Tasks are kept; they just stop belonging to the goal.
    await db.runAsync('UPDATE todos SET goal_id = NULL, updated_at = ? WHERE goal_id = ?', now, id);
    await db.runAsync('DELETE FROM goals WHERE id = ?', id);
  });
}

export const saveGoal: typeof saveGoalLocal = (...args) =>
  withDatabaseWrite(() => saveGoalLocal(...args));

export const removeGoal: typeof removeGoalLocal = (...args) =>
  withDatabaseWrite(() => removeGoalLocal(...args));
