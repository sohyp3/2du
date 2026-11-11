import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGoalStore } from '@/store/goalStore';
import { useSyncStore } from '@/store/syncStore';
import { getTodosForPick, type Todo } from '@/db/todos';
import type { Goal, GoalStatus } from '@/db/goals';
import { getStartOfWeek } from '@/utils/dates';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
import { GoalEditor } from '@/components/GoalEditor';

interface Progress {
  done: number;
  open: number;
}

export default function GoalsScreen() {
  const c = useColors(),
    fonts = useFontFamily();
  const goals = useGoalStore((s) => s.goals);
  const revision = useSyncStore((s) => s.revision);
  const { id: openId } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editor, setEditor] = useState<{ goal?: Goal } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const handledId = useRef<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  const reloadTodos = useCallback(() => {
    getTodosForPick()
      .then(setTodos)
      .catch((error) => console.error('Failed to load goal progress:', error));
  }, []);

  useEffect(() => {
    void useGoalStore.getState().load();
  }, []);

  useEffect(() => {
    reloadTodos();
  }, [revision, reloadTodos]);

  // Tasks added or completed on another screen change progress without a sync revision.
  useFocusEffect(reloadTodos);

  // `?id=<goal id>` opens that goal's editor once, when the goal is known.
  useEffect(() => {
    if (!openId || handledId.current === openId) return;
    const goal = goals.find((g) => g.id === openId);
    if (!goal) return;
    handledId.current = openId;
    setEditor({ goal });
  }, [openId, goals]);

  const progress = useMemo(() => {
    const weekStartMs = getStartOfWeek(new Date()).getTime();
    const byGoal = new Map<string, Progress>();
    for (const t of todos) {
      if (!t.goal_id) continue;
      const entry = byGoal.get(t.goal_id) ?? { done: 0, open: 0 };
      if (t.status === 'completed' && Date.parse(t.updated_at) >= weekStartMs) entry.done++;
      else if (t.status === 'pending' || t.status === 'in_progress') entry.open++;
      byGoal.set(t.goal_id, entry);
    }
    return byGoal;
  }, [todos]);

  const groups = useMemo(() => {
    const by = (status: GoalStatus) => goals.filter((g) => g.status === status);
    return { active: by('active'), paused: by('paused'), done: by('done') };
  }, [goals]);

  const openEditor = (next: { goal?: Goal }) => {
    setEditor(next);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const closeEditor = () => {
    setEditor(null);
    reloadTodos();
  };

  const newGoalButton = (
    <PressFeedback
      accessibilityRole="button"
      onPress={() => openEditor({})}
      style={{
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: c.primary,
      }}>
      <Ionicons name="add" size={18} color={c.onPrimary} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.onPrimary }}>New goal</Text>
    </PressFeedback>
  );

  const renderRow = (goal: Goal) => {
    const p = progress.get(goal.id) ?? { done: 0, open: 0 };
    const target = goal.weekly_target;
    const percent = target ? Math.min(100, (p.done / target) * 100) : 0;
    return (
      <View
        key={goal.id}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 14,
          backgroundColor: c.surfaceContainerLow,
          borderWidth: 1,
          borderColor: c.outlineVariant,
          marginBottom: 8,
        }}>
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={`Edit ${goal.name}`}
          onPress={() => openEditor({ goal })}
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            minHeight: 44,
            padding: 14,
          }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.medium, fontSize: 16, color: c.onSurface }}>
              {goal.name}
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                color: c.onSurfaceVariant,
                marginTop: 2,
              }}>
              {p.open ? `${p.open} open ${p.open === 1 ? 'task' : 'tasks'}` : 'No tasks yet'}
            </Text>
            {target != null && (
              <View style={{ marginTop: 8 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: c.outlineVariant,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      height: 4,
                      width: `${percent}%`,
                      backgroundColor: c.primary,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 12,
                    color: c.onSurfaceVariant,
                    marginTop: 4,
                  }}>
                  {`${p.done} of ${target} this week`}
                </Text>
              </View>
            )}
          </View>
          <View
            accessibilityLabel={`Importance ${goal.importance}`}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.surfaceContainerHigh,
            }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: c.onSurface }}>
              {goal.importance}
            </Text>
          </View>
        </PressFeedback>
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={`Add task to ${goal.name}`}
          onPress={() => router.push({ pathname: '/add-todo', params: { goal: goal.id } })}
          style={{
            width: 44,
            height: 44,
            marginRight: 6,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="add-circle-outline" size={24} color={c.primary} />
        </PressFeedback>
      </View>
    );
  };

  const section = (title: string, list: Goal[]) =>
    list.length ? (
      <View style={{ marginTop: 20 }}>
        <Text
          style={{
            fontFamily: fonts.medium,
            fontSize: 13,
            color: c.onSurfaceVariant,
            marginBottom: 8,
          }}>
          {title}
        </Text>
        {list.map(renderRow)}
      </View>
    ) : null;

  const empty = goals.length === 0;

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 840, alignSelf: 'center', paddingHorizontal: 16 }}>
        <View style={{ paddingTop: 16 }}>
          {editor && (
            <GoalEditor key={editor.goal?.id ?? 'new'} goal={editor.goal} onClose={closeEditor} />
          )}

          {empty ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 16 }}>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 15,
                  lineHeight: 22,
                  color: c.onSurfaceVariant,
                  textAlign: 'center',
                }}>
                Nothing here yet. Add the things you want to move forward: a language, a project, a
                habit.
              </Text>
              {newGoalButton}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                {newGoalButton}
              </View>
              {section('Active', groups.active)}
              {section('Paused', groups.paused)}
              {groups.done.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <PressFeedback
                    accessibilityRole="button"
                    accessibilityState={{ expanded: doneOpen }}
                    onPress={() => setDoneOpen((o) => !o)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 44,
                    }}>
                    <Ionicons
                      name={doneOpen ? 'chevron-down' : 'chevron-forward'}
                      size={16}
                      color={c.onSurfaceVariant}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        fontSize: 13,
                        color: c.onSurfaceVariant,
                      }}>
                      {`Done (${groups.done.length})`}
                    </Text>
                  </PressFeedback>
                  {doneOpen && groups.done.map(renderRow)}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
