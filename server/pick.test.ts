import { test, expect } from 'bun:test';
import {
  scoreCandidates,
  pick,
  type Candidate,
  type PickGoal,
  type PickTodo,
} from '../shared/pick';

const DAY = 86_400_000;
// Wednesday noon, and the Monday of that week.
const now = new Date('2026-03-18T12:00:00.000Z');
const weekStart = new Date('2026-03-16T00:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
const nowIso = iso(now.getTime());

const todo = (over: Partial<PickTodo> = {}): PickTodo => ({
  id: 't1',
  name: 'Task',
  datetime: iso(now.getTime() + 2 * DAY),
  status: 'pending',
  priority: 'moderate',
  time_needed: null,
  goal_id: null,
  updated_at: nowIso,
  ...over,
});
const goal = (over: Partial<PickGoal> = {}): PickGoal => ({
  id: 'g1',
  name: 'Russian',
  importance: 5,
  weekly_target: null,
  status: 'active',
  ...over,
});
const score = (todos: PickTodo[], goals: PickGoal[] = [], minutes?: number | null) =>
  scoreCandidates({ todos, goals, now, weekStart, minutes });
const byId = (cs: Candidate[], id: string) => cs.find((c) => c.id === id)!;

// Deterministic generator (mulberry32) for the distribution test.
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('an overdue todo outweighs the same todo due in five days', () => {
  const cs = score([
    todo({ id: 'late', datetime: iso(now.getTime() - 3600_000) }),
    todo({ id: 'later', datetime: iso(now.getTime() + 5 * DAY) }),
  ]);
  expect(cs[0]!.id).toBe('late');
  expect(byId(cs, 'late').weight).toBeGreaterThan(byId(cs, 'later').weight);
  expect(byId(cs, 'late').reasons).toContain('overdue');
});

test('a linked todo uses the goal importance, an unlinked one uses its priority', () => {
  // Due in two days (urgency 1.8), goal with a completed task today so neglect is 1.
  const cs = score(
    [
      todo({ id: 'linked', goal_id: 'g1' }),
      todo({ id: 'free', priority: 'high' }),
      todo({ id: 'done', goal_id: 'g1', status: 'completed', datetime: nowIso }),
    ],
    [goal({ importance: 6 })]
  );
  expect(byId(cs, 'linked').weight).toBeCloseTo(6 * 1.8, 6);
  expect(byId(cs, 'free').weight).toBeCloseTo(8 * 1.8, 6);
  expect(byId(cs, 'linked').reasons).toContain('importance 6');
  expect(byId(cs, 'free').reasons).not.toContain('importance 6');
});

test('time_needed filters by minutes; a todo without time_needed always fits', () => {
  const todos = [todo({ id: 'long', time_needed: 90 }), todo({ id: 'open', time_needed: null })];
  expect(score(todos, [], 60).map((c) => c.id)).toEqual(['open']);
  expect(
    score(todos, [], 120)
      .map((c) => c.id)
      .sort()
  ).toEqual(['long', 'open']);
  expect(byId(score(todos, [], 120), 'long').reasons).toContain('fits 90 min');
  expect(
    score(todos)
      .map((c) => c.id)
      .sort()
  ).toEqual(['long', 'open']);
});

test('a todo more than seven days ahead is skipped', () => {
  expect(score([todo({ datetime: iso(now.getTime() + 8 * DAY) })])).toEqual([]);
  expect(score([todo({ datetime: iso(now.getTime() + 6 * DAY) })])).toHaveLength(1);
});

test('todos of a paused or done goal are skipped; an unknown goal_id counts as unlinked', () => {
  const paused = score([todo({ goal_id: 'g1' })], [goal({ status: 'paused' })]);
  expect(paused).toEqual([]);
  const done = score([todo({ goal_id: 'g1' })], [goal({ status: 'done' })]);
  expect(done).toEqual([]);
  const unknown = score([todo({ id: 'x', goal_id: 'missing', priority: 'low' })], [goal()]);
  expect(byId(unknown, 'x').weight).toBeCloseTo(2 * 1.8, 6);
  expect(byId(unknown, 'x').reasons.some((r) => r.startsWith('importance'))).toBe(false);
});

test('weekly target: late in the week outweighs early when nothing is done yet', () => {
  const early = new Date('2026-03-16T12:00:00.000Z');
  const late = new Date('2026-03-22T12:00:00.000Z');
  const g = goal({ weekly_target: 3 });
  const weightAt = (at: Date) =>
    scoreCandidates({ todos: [], goals: [g], now: at, weekStart, minutes: null })[0]!.weight;
  expect(weightAt(late)).toBeGreaterThan(weightAt(early));
});

test('weekly target: three of three done gives a quota of 0.25', () => {
  const doneToday = [0, 1, 2].map((i) =>
    todo({ id: `d${i}`, goal_id: 'g1', status: 'completed', updated_at: nowIso })
  );
  const cs = score(doneToday, [goal({ importance: 8, weekly_target: 3 })]);
  expect(cs).toHaveLength(1);
  expect(cs[0]!.kind).toBe('goal');
  expect(cs[0]!.weight).toBeCloseTo(8 * 0.25 * 1, 6);
  expect(cs[0]!.reasons).toContain('weekly target 3 of 3 done');
});

test('neglect: a goal untouched for ten days outweighs the same goal touched today', () => {
  const stale = iso(now.getTime() - 10 * DAY);
  const cs = score(
    [
      todo({ id: 'old', goal_id: 'stale', status: 'completed', updated_at: stale }),
      todo({ id: 'new', goal_id: 'fresh', status: 'completed', updated_at: nowIso }),
    ],
    [goal({ id: 'stale', name: 'Old' }), goal({ id: 'fresh', name: 'New' })]
  );
  expect(byId(cs, 'stale').weight).toBeGreaterThan(byId(cs, 'fresh').weight);
  expect(byId(cs, 'stale').reasons).toContain('untouched for 10 days');
});

test('an active goal with no active todo is a goal candidate; one with a todo is not', () => {
  const cs = score(
    [todo({ id: 'has', goal_id: 'busy' })],
    [goal({ id: 'busy' }), goal({ id: 'idle', name: 'Cyber security' })]
  );
  expect(cs.filter((c) => c.kind === 'goal').map((c) => c.id)).toEqual(['idle']);
  expect(cs.find((c) => c.id === 'busy')).toBeUndefined();
});

test('pick: rng 0 chooses the heaviest, rng just under 1 chooses the lightest', () => {
  const cs = score([
    todo({ id: 'a', priority: 'urgent' }),
    todo({ id: 'b', priority: 'low' }),
    todo({ id: 'c', priority: 'moderate' }),
  ]);
  expect(cs.map((c) => c.id)[0]).toBe('a');
  expect(pick(cs, () => 0).choice!.id).toBe('a');
  expect(pick(cs, () => 0.999999).choice!.id).toBe('b');
});

test('pick with no candidates returns no choice', () => {
  expect(pick([])).toEqual({ choice: null, alternatives: [] });
});

test('a candidate with a tenth of the total weight is picked 8% to 12% of the time', () => {
  const mk = (id: string, weight: number): Candidate => ({
    kind: 'todo',
    id,
    name: id,
    goal_id: null,
    weight,
    reasons: [],
  });
  const cands = [mk('heavy', 9), mk('light', 1)];
  const rng = seeded(42);
  let hits = 0;
  for (let i = 0; i < 10_000; i++) if (pick(cands, rng).choice!.id === 'light') hits++;
  expect(hits / 10_000).toBeGreaterThan(0.08);
  expect(hits / 10_000).toBeLessThan(0.12);
});

test('alternatives never contain the choice and hold at most three items', () => {
  const cs = score([
    todo({ id: 'a' }),
    todo({ id: 'b' }),
    todo({ id: 'c' }),
    todo({ id: 'd' }),
    todo({ id: 'e' }),
  ]);
  const result = pick(cs, () => 0.5);
  expect(result.alternatives.length).toBeLessThanOrEqual(3);
  expect(result.alternatives.length).toBe(3);
  expect(result.alternatives.map((c) => c.id)).not.toContain(result.choice!.id);
});

test('reasons of an overdue linked todo with a weekly target include importance, overdue and weekly target', () => {
  const cs = score(
    [todo({ id: 'x', goal_id: 'g1', datetime: iso(now.getTime() - DAY) })],
    [goal({ weekly_target: 3 })]
  );
  const reasons = byId(cs, 'x').reasons.join(' | ');
  expect(reasons).toContain('importance');
  expect(reasons).toContain('overdue');
  expect(reasons).toContain('weekly target');
});
