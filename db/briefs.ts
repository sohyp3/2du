import { db } from './database';

export interface Brief {
  id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getBrief(date: string): Promise<Brief | null> {
  return db.getFirstAsync<Brief>('SELECT * FROM briefs WHERE date = ?', date);
}

export async function getRecentBriefs(limit = 14): Promise<Brief[]> {
  return db.getAllAsync<Brief>('SELECT * FROM briefs ORDER BY date DESC LIMIT ?', limit);
}
