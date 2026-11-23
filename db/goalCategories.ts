import { db, withDatabaseWrite } from './database';
import { validateChange } from '../shared/records';

export interface GoalCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export async function getCategories() {
  return db.getAllAsync<GoalCategory>('SELECT * FROM goal_categories ORDER BY created_at, name');
}

async function saveCategoryLocal(category: GoalCategory) {
  const data = { ...category, name: category.name.trim() };
  validateChange({ entity: 'goal_categories', id: data.id, data, updated_at: data.updated_at });
  await db.runAsync(
    'INSERT OR REPLACE INTO goal_categories (id,name,color,created_at,updated_at) VALUES(?,?,?,?,?)',
    data.id,
    data.name,
    data.color,
    data.created_at,
    data.updated_at
  );
}

async function deleteCategoryLocal(id: string) {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    // Goals are kept; they just stop belonging to the category.
    await db.runAsync(
      'UPDATE goals SET category_id=NULL, updated_at=? WHERE category_id=?',
      now,
      id
    );
    await db.runAsync('DELETE FROM goal_categories WHERE id=?', id);
  });
}

export const saveCategory: typeof saveCategoryLocal = (...args) =>
  withDatabaseWrite(() => saveCategoryLocal(...args));

export const deleteCategory: typeof deleteCategoryLocal = (...args) =>
  withDatabaseWrite(() => deleteCategoryLocal(...args));
