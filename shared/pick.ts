// Scores tasks and goals for "Pick for me" and draws one at random by weight.
// Plain TypeScript only: no app or database imports, so the same file can be copied to the server.

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export interface PickTodo {
  id: string;
  name: string;
  datetime: string;
  status: string;
  priority: string;
  time_needed: number | null;
  goal_id: string | null;
  updated_at: string;
}

export interface PickGoal {
  id: string;
  name: string;
  importance: number;
  weekly_target: number | null;
  status: string;
}

export interface Candidate {
  kind: 'todo' | 'goal';
  id: string;
  name: string;
  goal_id: string | null;
  weight: number;
  reasons: string[];
}

interface GoalStats {
  done: number;
  idleDays: number;
  neglect: number;
  quota: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function quotaFor(goal: PickGoal, done: number, nowMs: number, weekStartMs: number): number {
  if (goal.weekly_target == null) return 1;
  const remaining = goal.weekly_target - done;
  if (remaining <= 0) return 0.25;
  const elapsed = clamp((nowMs - weekStartMs) / WEEK, 0, 1);
  return 1 + (remaining / goal.weekly_target) * elapsed * 2;
}

function priorityBase(priority: string): number {
  if (priority === 'urgent' || priority === 'high') return 8;
  if (priority === 'moderate' || priority === 'medium') return 5;
  if (priority === 'low') return 2;
  return 5;
}

function urgencyFor(days: number): number {
  if (days <= 0) return 3;
  if (days <= 1) return 2.5;
  if (days <= 3) return 1.8;
  return 1.3;
}

export function scoreCandidates(input: {
  todos: PickTodo[];
  goals: PickGoal[];
  now: Date;
  weekStart: Date;
  minutes?: number | null;
}): Candidate[] {
  const { todos, goals, now, weekStart, minutes } = input;
  const nowMs = now.getTime();
  const weekStartMs = weekStart.getTime();
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const activeGoals = goals.filter((g) => g.status === 'active');
  const activeTodos = todos.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  const stats = new Map<string, GoalStats>();
  for (const goal of activeGoals) {
    const own = todos.filter((t) => t.goal_id === goal.id);
    const done = own.filter(
      (t) => t.status === 'completed' && Date.parse(t.updated_at) >= weekStartMs
    ).length;
    const touched = own
      .filter((t) => t.status === 'completed' || t.status === 'in_progress')
      .map((t) => Date.parse(t.updated_at));
    const idleDays = touched.length ? clamp((nowMs - Math.max(...touched)) / DAY, 0, 14) : 14;
    stats.set(goal.id, {
      done,
      idleDays,
      neglect: 1 + idleDays / 14,
      quota: quotaFor(goal, done, nowMs, weekStartMs),
    });
  }

  const candidates: Candidate[] = [];

  for (const t of activeTodos) {
    const goal = t.goal_id == null ? undefined : goalById.get(t.goal_id);
    // Tasks of a paused or finished goal are left out entirely.
    if (goal && goal.status !== 'active') continue;
    if (typeof minutes === 'number' && typeof t.time_needed === 'number' && t.time_needed > minutes)
      continue;
    const dueDays = (Date.parse(t.datetime) - nowMs) / DAY;
    if (dueDays > 7) continue;

    const linked = goal;
    const st = linked ? stats.get(linked.id) : undefined;
    const base = linked ? linked.importance : priorityBase(t.priority);
    const progress = t.status === 'in_progress' ? 1.2 : 1;
    const goalFactor = st ? st.quota * st.neglect : 1;
    const weight = base * urgencyFor(dueDays) * progress * goalFactor;

    const reasons: string[] = [];
    if (linked) reasons.push(`importance ${linked.importance}`);
    if (dueDays <= 0) reasons.push('overdue');
    else if (dueDays <= 1) reasons.push('due within a day');
    if (t.status === 'in_progress') reasons.push('in progress');
    if (linked && st && linked.weekly_target != null)
      reasons.push(`weekly target ${st.done} of ${linked.weekly_target} done`);
    if (st && st.idleDays >= 3) reasons.push(`untouched for ${Math.floor(st.idleDays)} days`);
    if (typeof minutes === 'number' && typeof t.time_needed === 'number')
      reasons.push(`fits ${t.time_needed} min`);

    candidates.push({
      kind: 'todo',
      id: t.id,
      name: t.name,
      goal_id: t.goal_id ?? null,
      weight,
      reasons,
    });
  }

  // An active goal with no open task of its own is offered as a goal to work on.
  for (const goal of activeGoals) {
    if (activeTodos.some((t) => t.goal_id === goal.id)) continue;
    const st = stats.get(goal.id)!;
    const reasons: string[] = [`importance ${goal.importance}`];
    if (goal.weekly_target != null)
      reasons.push(`weekly target ${st.done} of ${goal.weekly_target} done`);
    if (st.idleDays >= 3) reasons.push(`untouched for ${Math.floor(st.idleDays)} days`);
    candidates.push({
      kind: 'goal',
      id: goal.id,
      name: goal.name,
      goal_id: goal.id,
      weight: goal.importance * st.quota * st.neglect,
      reasons,
    });
  }

  return candidates.sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function pick(
  candidates: Candidate[],
  rng: () => number = Math.random
): { choice: Candidate | null; alternatives: Candidate[] } {
  if (!candidates.length) return { choice: null, alternatives: [] };
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  let r = rng() * total;
  let choice = candidates[candidates.length - 1]!;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) {
      choice = c;
      break;
    }
  }
  const alternatives = candidates.filter((c) => c !== choice).slice(0, 3);
  return { choice, alternatives };
}
