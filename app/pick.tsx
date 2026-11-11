import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getTodosForPick } from '@/db/todos';
import { getSetting, setSetting } from '@/db/database';
import { useGoalStore } from '@/store/goalStore';
import {
  bestTaskFor,
  pick,
  scoreCandidates,
  scoreGoals,
  type Candidate,
  type PickGoal,
} from '@/shared/pick';
import { getStartOfWeek } from '@/utils/dates';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
import { Chip, Segmented } from '@/components/Chip';

const CHOICES: { label: string; minutes: number | null }[] = [
  { label: 'Any time', minutes: null },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
];

type Kind = 'both' | 'tasks' | 'goals';
const KINDS = [
  { value: 'both', label: 'Both' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'goals', label: 'Goals' },
] as const satisfies readonly { value: Kind; label: string }[];

interface Deck {
  /** What is drawn from: tasks and/or goals depending on the mode. */
  candidates: Candidate[];
  /** Task candidates for the current time, used to find a drawn goal's next task. */
  tasks: Candidate[];
  /** Task candidates ignoring the time chip, to tell "none fits" from "none at all". */
  allTasks: Candidate[];
  choice: Candidate | null;
  // Keys of candidates already shown this session; "Another" avoids them until all were shown.
  seen: string[];
  // Why nothing is offered, when nothing is: nothing at all, or nothing fits the time.
  empty: 'none' | 'time' | null;
}

const keyOf = (c: Candidate) => `${c.kind}:${c.id}`;

function parseChoice(value: string | null): number | null {
  const minutes = Number(value);
  return CHOICES.some((c) => c.minutes === minutes) ? minutes : null;
}
const parseKind = (value: string | null): Kind =>
  value === 'tasks' || value === 'goals' ? value : 'both';

async function buildDeck(minutes: number | null, kind: Kind, goals: PickGoal[]): Promise<Deck> {
  const now = new Date();
  const todos = (await getTodosForPick()).map((t) => ({
    id: t.id,
    name: t.name,
    datetime: t.datetime,
    status: t.status,
    priority: t.priority,
    time_needed: t.time_needed,
    goal_id: t.goal_id ?? null,
    updated_at: t.updated_at,
  }));
  const input = { todos, goals, now, weekStart: getStartOfWeek(now) };
  const draw = (m: number | null) => {
    const mixed = scoreCandidates({ ...input, minutes: m });
    const tasks = mixed.filter((c) => c.kind === 'todo');
    if (kind === 'tasks') return { candidates: tasks, tasks };
    if (kind === 'goals') return { candidates: scoreGoals(input), tasks };
    return { candidates: mixed, tasks };
  };
  const unfiltered = draw(null);
  const everything = unfiltered.candidates;
  const { candidates, tasks } = minutes == null ? unfiltered : draw(minutes);
  const choice = pick(candidates).choice;
  const empty = candidates.length ? null : everything.length ? 'time' : 'none';
  return {
    candidates,
    tasks,
    allTasks: unfiltered.tasks,
    choice,
    seen: choice ? [keyOf(choice)] : [],
    empty,
  };
}

export default function PickScreen() {
  const c = useColors(),
    fonts = useFontFamily();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goals = useGoalStore((s) => s.goals);
  const [minutes, setMinutes] = useState<number | null | undefined>(undefined);
  const [kind, setKind] = useState<Kind | undefined>(undefined);
  const [deck, setDeck] = useState<Deck | null>(null);

  // The last time chip and mode are remembered; read them once before the first draw.
  useEffect(() => {
    Promise.all([getSetting('pick_minutes'), getSetting('pick_kind')])
      .then(([m, k]) => {
        setMinutes(parseChoice(m));
        setKind(parseKind(k));
      })
      .catch(() => {
        setMinutes(null);
        setKind('both');
      });
  }, []);

  useEffect(() => {
    if (minutes === undefined || kind === undefined) return;
    let live = true;
    // Goals are read as a snapshot per draw: a goal edit does not redraw the choice on screen.
    buildDeck(minutes, kind, useGoalStore.getState().goals)
      .then((next) => live && setDeck(next))
      .catch((error) => console.error('Failed to pick:', error));
    return () => {
      live = false;
    };
  }, [minutes, kind]);

  const remember = (key: string, value: string) =>
    setSetting(key, value).catch((error) => console.error(`Failed to remember ${key}:`, error));

  const chooseTime = (next: number | null) => {
    setMinutes(next);
    remember('pick_minutes', next == null ? 'any' : String(next));
  };
  const chooseKind = (next: Kind) => {
    setKind(next);
    remember('pick_kind', next);
  };

  const another = () => {
    if (!deck?.choice) return;
    const { candidates, choice, seen } = deck;
    let pool = candidates.filter((x) => !seen.includes(keyOf(x)));
    let nextSeen = seen;
    if (!pool.length) {
      // Every candidate was shown: start over, but not with the one on screen.
      nextSeen = [];
      pool = candidates.filter((x) => x !== choice);
      if (!pool.length) pool = candidates;
    }
    const next = pick(pool).choice;
    if (!next) return;
    setDeck({ ...deck, choice: next, seen: [...nextSeen, keyOf(next)] });
  };

  const makeChoice = (next: Candidate) => {
    if (!deck) return;
    setDeck({ ...deck, choice: next, seen: [...deck.seen, keyOf(next)] });
  };

  const choice = deck?.choice ?? null;
  // A drawn goal is worked on through its best open task (that fits the time).
  const task: Candidate | null = !choice
    ? null
    : choice.kind === 'todo'
      ? choice
      : bestTaskFor(choice.id, deck?.tasks ?? []);

  const startTask = () => {
    if (!task) return;
    router.replace({
      pathname: '/focus',
      params: { id: task.id, ...(minutes ? { minutes: String(minutes) } : {}) },
    });
  };

  const alternatives = useMemo(
    () => (deck ? deck.candidates.filter((x) => x !== deck.choice).slice(0, 3) : []),
    [deck]
  );

  const goalName =
    choice?.kind === 'todo' && choice.goal_id
      ? goals.find((g) => g.id === choice.goal_id)?.name
      : undefined;

  const button = (label: string, onPress: () => void, primary = false, icon?: 'play') => (
    <PressFeedback
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: primary ? 1 : undefined,
        minHeight: 52,
        paddingHorizontal: space.xl,
        borderRadius: radius.lg,
        flexDirection: 'row',
        gap: space.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? c.primary : c.surfaceContainer,
      }}>
      {icon && <Ionicons name={icon} size={16} color={c.onPrimary} />}
      <Text
        style={{
          fontFamily: primary ? fonts.bold : fonts.medium,
          ...type.body,
          color: primary ? c.onPrimary : c.onSurface,
        }}>
        {label}
      </Text>
    </PressFeedback>
  );

  const link = (label: string, onPress: () => void) => (
    <PressFeedback
      accessibilityRole="link"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.medium, ...type.label, color: c.primary }}>{label}</Text>
    </PressFeedback>
  );

  const emptyText =
    deck?.empty === 'time'
      ? 'Nothing fits that time. Try a longer slot.'
      : kind === 'goals'
        ? 'No active goals yet. Add one to let it pick for you.'
        : kind === 'tasks'
          ? 'No open tasks this week. Add one first.'
          : 'Nothing to pick. Add a task or a goal first.';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + space.xxl }}>
      <View
        style={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 640,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          gap: space.md,
        }}>
        <Segmented options={KINDS} value={kind ?? 'both'} onChange={chooseKind} grow />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginHorizontal: -space.lg }}
          contentContainerStyle={{ gap: space.xs, paddingHorizontal: space.lg }}>
          {CHOICES.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              selected={item.minutes === (minutes ?? null)}
              onPress={() => chooseTime(item.minutes)}
            />
          ))}
        </ScrollView>

        {!deck ? null : deck.empty ? (
          <View style={{ flex: 1, justifyContent: 'center', gap: space.lg, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: fonts.regular,
                ...type.body,
                color: c.onSurfaceVariant,
                textAlign: 'center',
              }}>
              {emptyText}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              {link('Add a task', () => router.push('/add-todo'))}
              {link('Goals', () => router.push('/goals'))}
            </View>
          </View>
        ) : choice ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              paddingVertical: space.xxl,
              gap: space.xxl,
            }}>
            <View style={{ gap: space.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontSize: 32,
                  lineHeight: 40,
                  letterSpacing: -0.5,
                  color: c.onSurface,
                  writingDirection: 'auto',
                }}>
                {choice.name}
              </Text>
              {(goalName || choice.reasons.length > 0) && (
                <Text
                  style={{ fontFamily: fonts.regular, ...type.label, color: c.onSurfaceVariant }}>
                  {(goalName ? [goalName, ...choice.reasons] : choice.reasons).join(' · ')}
                </Text>
              )}
              {choice.kind === 'goal' && (
                <View
                  style={{
                    marginTop: space.md,
                    padding: space.lg,
                    borderRadius: radius.lg,
                    backgroundColor: c.surfaceContainer,
                    gap: 2,
                  }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      ...type.caption,
                      color: c.onSurfaceVariant,
                    }}>
                    {task
                      ? 'Next task'
                      : bestTaskFor(choice.id, deck?.allTasks ?? [])
                        ? 'None of its tasks fits that time'
                        : 'No open task for this goal yet'}
                  </Text>
                  {task && (
                    <Text style={{ fontFamily: fonts.medium, ...type.body, color: c.onSurface }}>
                      {task.name}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {task
                  ? button('Start', startTask, true, 'play')
                  : button(
                      'Add a task',
                      () => router.push({ pathname: '/add-todo', params: { goal: choice.id } }),
                      true
                    )}
                {button('Another', another)}
              </View>
              {task && (
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {link('Open task', () => router.push(`/todo/${task.id}`))}
                </View>
              )}
            </View>

            {alternatives.length > 0 && (
              <View style={{ gap: space.xs }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    ...type.caption,
                    color: c.onSurfaceVariant,
                    marginBottom: space.xs,
                  }}>
                  Also good
                </Text>
                {alternatives.map((alt) => (
                  <PressFeedback
                    key={keyOf(alt)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${alt.name} instead`}
                    onPress={() => makeChoice(alt)}
                    style={{
                      minHeight: 48,
                      paddingHorizontal: space.lg,
                      borderRadius: radius.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      backgroundColor: c.surfaceContainerLow,
                    }}>
                    <Ionicons
                      name={alt.kind === 'goal' ? 'flag-outline' : 'ellipse-outline'}
                      size={14}
                      color={alt.kind === 'goal' ? c.secondary : c.outline}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontFamily: fonts.medium,
                        ...type.body,
                        color: c.onSurface,
                      }}>
                      {alt.name}
                    </Text>
                  </PressFeedback>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
