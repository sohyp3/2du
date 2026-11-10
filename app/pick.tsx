import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getTodosForPick } from '@/db/todos';
import { getSetting, setSetting } from '@/db/database';
import { useGoalStore } from '@/store/goalStore';
import { useTodoStore } from '@/store/todoStore';
import { pick, scoreCandidates, type Candidate, type PickGoal } from '@/shared/pick';
import { getStartOfWeek } from '@/utils/dates';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';

const CHOICES: { label: string; minutes: number | null }[] = [
  { label: 'Any', minutes: null },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
];

interface Deck {
  candidates: Candidate[];
  choice: Candidate | null;
  // Keys of candidates already shown this session; "Another" avoids them until all were shown.
  seen: string[];
  // Why nothing is offered, when nothing is: no tasks or goals at all, or none fit the time.
  empty: 'none' | 'time' | null;
}

const keyOf = (c: Candidate) => `${c.kind}:${c.id}`;

// The up-to-three heaviest candidates other than the choice, as pick() reports them.
function alternativesOf(candidates: Candidate[], choice: Candidate | null): Candidate[] {
  return candidates.filter((c) => c !== choice).slice(0, 3);
}

function parseChoice(value: string | null): number | null {
  const minutes = Number(value);
  return CHOICES.some((c) => c.minutes === minutes) ? minutes : null;
}

async function buildDeck(minutes: number | null, goals: PickGoal[]): Promise<Deck> {
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
  const everything = scoreCandidates({ ...input, minutes: null });
  const candidates = minutes == null ? everything : scoreCandidates({ ...input, minutes });
  const choice = pick(candidates).choice;
  const empty = candidates.length ? null : everything.length ? 'time' : 'none';
  return { candidates, choice, seen: choice ? [keyOf(choice)] : [], empty };
}

export default function PickScreen() {
  const c = useColors(),
    fonts = useFontFamily();
  const router = useRouter();
  const goals = useGoalStore((s) => s.goals);
  const [minutes, setMinutes] = useState<number | null | undefined>(undefined);
  const [deck, setDeck] = useState<Deck | null>(null);

  // The last time chip is remembered; read it once before the first draw.
  useEffect(() => {
    getSetting('pick_minutes')
      .then((value) => setMinutes(parseChoice(value)))
      .catch(() => setMinutes(null));
  }, []);

  useEffect(() => {
    if (minutes === undefined) return;
    let live = true;
    // Goals are read as a snapshot per draw: a goal edit does not redraw the choice on screen.
    buildDeck(minutes, useGoalStore.getState().goals)
      .then((next) => live && setDeck(next))
      .catch((error) => console.error('Failed to pick:', error));
    return () => {
      live = false;
    };
  }, [minutes]);

  const chooseTime = (next: number | null) => {
    setMinutes(next);
    setSetting('pick_minutes', next == null ? 'any' : String(next)).catch((error) =>
      console.error('Failed to remember the time choice:', error)
    );
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

  const startTask = () => {
    if (deck?.choice?.kind !== 'todo') return;
    void useTodoStore.getState().updateTodo(deck.choice.id, { status: 'in_progress' });
    router.back();
  };

  const alternatives = useMemo(
    () => (deck ? alternativesOf(deck.candidates, deck.choice) : []),
    [deck]
  );

  const choice = deck?.choice ?? null;
  const goalName =
    choice?.kind === 'todo' && choice.goal_id
      ? goals.find((g) => g.id === choice.goal_id)?.name
      : undefined;

  const button = (
    label: string,
    onPress: () => void,
    primary = false,
    accessibilityLabel?: string
  ) => (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 18,
        borderRadius: 12,
        justifyContent: 'center',
        backgroundColor: primary ? c.primary : 'transparent',
        borderWidth: 1,
        borderColor: primary ? c.primary : c.outlineVariant,
      }}>
      <Text
        style={{
          fontFamily: primary ? fonts.bold : fonts.medium,
          fontSize: 14,
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
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize: 14,
          color: c.primary,
          textDecorationLine: 'underline',
        }}>
        {label}
      </Text>
    </PressFeedback>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16 }}>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {CHOICES.map((item) => {
            const chosen = item.minutes === (minutes ?? null);
            return (
              <PressFeedback
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen }}
                onPress={() => chooseTime(item.minutes)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  justifyContent: 'center',
                  backgroundColor: chosen ? c.surfaceContainerHigh : 'transparent',
                  borderWidth: 1,
                  borderColor: chosen ? c.outline : c.outlineVariant,
                }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 13,
                    color: chosen ? c.onSurface : c.onSurfaceVariant,
                  }}>
                  {item.label}
                </Text>
              </PressFeedback>
            );
          })}
        </View>

        {!deck ? null : deck.empty ? (
          <View style={{ paddingVertical: 48, gap: 16, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 15,
                lineHeight: 22,
                color: c.onSurfaceVariant,
                textAlign: 'center',
              }}>
              {deck.empty === 'time'
                ? 'Nothing fits that time. Try a longer slot.'
                : 'Nothing to pick. Add a task or a goal first.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              {link('Add a task', () => router.push('/add-todo'))}
              {link('Goals', () => router.push('/goals'))}
            </View>
          </View>
        ) : choice ? (
          <View style={{ paddingTop: 40, gap: 24 }}>
            <View style={{ gap: 8 }}>
              {goalName && (
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 13,
                    color: c.onSurfaceVariant,
                  }}>
                  {goalName}
                </Text>
              )}
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: 'PlayfairDisplay_400Regular',
                  fontSize: 28,
                  color: c.onSurface,
                }}>
                {choice.name}
              </Text>
              {choice.reasons.length > 0 && (
                <Text
                  style={{ fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceVariant }}>
                  {choice.reasons.join(' · ')}
                </Text>
              )}
            </View>

            {choice.kind === 'todo' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {button('Start', startTask, true)}
                {button('Open', () => router.push(`/todo/${choice.id}`))}
                {button('Another', another)}
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text
                  style={{ fontFamily: fonts.regular, fontSize: 15, color: c.onSurfaceVariant }}>
                  No task set for this goal yet
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {button(
                    'Add a task',
                    () => router.push({ pathname: '/add-todo', params: { goal: choice.id } }),
                    true
                  )}
                  {button('Another', another)}
                </View>
              </View>
            )}

            {alternatives.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.onSurfaceVariant }}>
                  Also good
                </Text>
                {alternatives.map((alt) => (
                  <PressFeedback
                    key={keyOf(alt)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${alt.name} instead`}
                    onPress={() => makeChoice(alt)}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      justifyContent: 'center',
                      backgroundColor: c.surfaceContainerLow,
                      borderWidth: 1,
                      borderColor: c.outlineVariant,
                    }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: c.onSurface }}>
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
