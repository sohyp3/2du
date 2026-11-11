import { test, expect } from 'bun:test';
import { validateChange } from '../shared/records';

const now = '2026-01-01T00:00:00.000Z';
const goal = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  name: 'Learn Russian',
  description: null,
  importance: 8,
  weekly_target: 3,
  status: 'active',
  created_at: now,
  updated_at: now,
  ...over,
});
const goalChange = (over: Record<string, unknown> = {}) => ({
  entity: 'goals',
  id: 'g1',
  data: goal(over),
  updated_at: now,
});

test('a valid goal passes validation', () => {
  expect(() => validateChange(goalChange())).not.toThrow();
  expect(() =>
    validateChange(goalChange({ weekly_target: null, description: 'notes' }))
  ).not.toThrow();
});

test('goals reject out-of-range importance, weekly target and unknown status', () => {
  expect(() => validateChange(goalChange({ importance: 0 }))).toThrow('Invalid importance');
  expect(() => validateChange(goalChange({ importance: 11 }))).toThrow('Invalid importance');
  expect(() => validateChange(goalChange({ weekly_target: 0 }))).toThrow('Invalid weekly target');
  expect(() => validateChange(goalChange({ status: 'archived' }))).toThrow('Invalid goal');
});

test('a todo may carry a goal_id, and unknown goal fields are still refused', () => {
  const todo = {
    id: 't1',
    name: 'Anki deck',
    description: null,
    time_needed: 30,
    priority: 'moderate',
    datetime: now,
    status: 'pending',
    parent_id: null,
    remind_me: 0,
    calendar_id: 'daily',
    goal_id: 'g1',
    created_at: now,
    updated_at: now,
  };
  expect(() =>
    validateChange({ entity: 'todos', id: 't1', data: todo, updated_at: now })
  ).not.toThrow();
  expect(() =>
    validateChange({
      entity: 'todos',
      id: 't1',
      data: { ...todo, goal_id: 'x'.repeat(200) },
      updated_at: now,
    })
  ).toThrow('Invalid text');
  expect(() =>
    validateChange({ entity: 'todos', id: 't1', data: { ...todo, mood: 'x' }, updated_at: now })
  ).toThrow('Unknown record field');
});

const briefChange = (over: Record<string, unknown> = {}, id = '2026-11-10') => ({
  entity: 'briefs',
  id,
  data: { id, date: id, content: '# Today', created_at: now, updated_at: now, ...over },
  updated_at: now,
});

test('briefs accept a valid record and reject a date that differs from the id or long content', () => {
  expect(() => validateChange(briefChange())).not.toThrow();
  expect(() => validateChange(briefChange({ date: '2026-11-11' }))).toThrow('Invalid brief');
  expect(() => validateChange(briefChange({ content: 'x'.repeat(20001) }))).toThrow(
    'Invalid brief'
  );
});
