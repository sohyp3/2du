import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGoalStore } from '@/store/goalStore';
import { useSyncStore } from '@/store/syncStore';
import { getTodosForPick, type Todo } from '@/db/todos';
import type { Goal, GoalStatus } from '@/db/goals';
import { getStartOfWeek } from '@/utils/dates';
import { useGoalCategoriesStore } from '@/store/goalCategoriesStore';
import { contrastText } from '@/utils/palette';
import { DISPLAY_FONT_SEMI, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
import { GoalEditor } from '@/components/GoalEditor';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/Card';
import { Chip, ColorChip } from '@/components/Chip';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

/** The filter value that shows every category. */
const ALL = '';

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
  const [filter, setFilter] = useState<string>(ALL);
  const categories = useGoalCategoriesStore((s) => s.categories);
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

  const categoryById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);
  /** A goal's category id, or null when it has none or its category is gone. */
  const categoryOf = useCallback(
    (g: Goal) => (g.category_id && categoryById.has(g.category_id) ? g.category_id : null),
    [categoryById]
  );

  const groups = useMemo(() => {
    const shown = goals.filter((g) => filter === ALL || categoryOf(g) === filter);
    const by = (status: GoalStatus) => shown.filter((g) => g.status === status);
    const current = [...by('active'), ...by('paused')];
    const byCategory = [...categories, null].map((cat) => ({
      category: cat,
      goals: current.filter((g) => categoryOf(g) === (cat?.id ?? null)),
    }));
    return {
      active: by('active'),
      current: byCategory.filter((group) => group.goals.length > 0),
      done: by('done'),
    };
  }, [goals, categories, filter, categoryOf]);

  /** Categories with at least one goal, for the filter row. */
  const usedCategories = useMemo(
    () => categories.filter((cat) => goals.some((g) => categoryOf(g) === cat.id)),
    [categories, goals, categoryOf]
  );

  // A filter on a category that no longer has goals falls back to All.
  useEffect(() => {
    if (filter !== ALL && !usedCategories.some((cat) => cat.id === filter)) setFilter(ALL);
  }, [filter, usedCategories]);

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
        minHeight: 40,
        paddingLeft: space.md,
        paddingRight: space.lg,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: c.primary,
      }}>
      <Ionicons name="add" size={18} color={c.onPrimary} />
      <Text style={{ fontFamily: fonts.medium, ...type.label, color: c.onPrimary }}>New goal</Text>
    </PressFeedback>
  );

  const renderRow = (goal: Goal) => {
    const p = progress.get(goal.id) ?? { done: 0, open: 0 };
    const target = goal.weekly_target;
    const met = target != null && p.done >= target;
    const fill = categoryById.get(goal.category_id ?? '')?.color ?? c.primary;
    return (
      <Card key={goal.id} padded={false} style={{ marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel={`Edit ${goal.name}`}
            onPress={() => openEditor({ goal })}
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: space.lg, gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontFamily: DISPLAY_FONT_SEMI,
                  fontSize: 18,
                  lineHeight: 24,
                  color: c.onSurface,
                }}>
                {goal.name}
              </Text>
              <View
                accessibilityLabel={`Importance ${goal.importance}`}
                style={{
                  paddingHorizontal: space.sm,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  backgroundColor: c.surfaceContainerHigh,
                }}>
                <Text style={{ fontFamily: fonts.bold, ...type.caption, color: c.onSurface }}>
                  {`★ ${goal.importance}`}
                </Text>
              </View>
              {goal.status === 'paused' && (
                <Text
                  style={{ fontFamily: fonts.medium, ...type.caption, color: c.onSurfaceVariant }}>
                  Paused
                </Text>
              )}
            </View>
            {target != null && <ProgressBar fraction={p.done / target} color={fill} />}
            <Text style={{ fontFamily: fonts.regular, ...type.label, color: c.onSurfaceVariant }}>
              {[
                target != null ? `${p.done} / ${target} this week${met ? ' 🔥' : ''}` : null,
                p.open ? `${p.open} open ${p.open === 1 ? 'task' : 'tasks'}` : 'No open tasks',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </PressFeedback>
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel={`Add task to ${goal.name}`}
            onPress={() => router.push({ pathname: '/add-todo', params: { goal: goal.id } })}
            style={{
              width: 44,
              height: 44,
              marginRight: space.sm,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="add-circle-outline" size={26} color={c.primary} />
          </PressFeedback>
        </View>
      </Card>
    );
  };

  const banner = (label: string, count: number, color: string, ink: string) => (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.md,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: color,
        marginBottom: space.md,
      }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fonts.bold, ...type.label, color: ink }}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.medium, ...type.label, color: ink, opacity: 0.8 }}>
        {count}
      </Text>
    </View>
  );

  const empty = goals.length === 0;

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 840, alignSelf: 'center', paddingHorizontal: 16 }}>
        <ScreenHeader
          title="Goals"
          emoji="🎯"
          showSettings
          subtitle={
            groups.active.length
              ? `${groups.active.length} active`
              : 'What you want to move forward'
          }
          actions={!empty && !editor ? newGoalButton : undefined}
        />
        <View>
          {editor && (
            <GoalEditor key={editor.goal?.id ?? 'new'} goal={editor.goal} onClose={closeEditor} />
          )}

          {empty ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: space.lg }}>
              <Text style={{ fontSize: 56, lineHeight: 68 }}>🎯</Text>
              <Text
                style={{
                  fontFamily: DISPLAY_FONT_SEMI,
                  ...type.title,
                  color: c.onSurface,
                  textAlign: 'center',
                }}>
                What do you want to get better at?
              </Text>
              {newGoalButton}
            </View>
          ) : (
            <>
              {usedCategories.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: space.sm,
                    marginBottom: space.sm,
                  }}>
                  <Chip label="All" selected={filter === ALL} onPress={() => setFilter(ALL)} />
                  {usedCategories.map((cat) => (
                    <ColorChip
                      key={cat.id}
                      label={cat.name}
                      color={cat.color}
                      selected={filter === cat.id}
                      icon={filter === cat.id ? 'checkmark' : undefined}
                      onPress={() => setFilter(cat.id)}
                    />
                  ))}
                </View>
              )}
              {groups.current.map(({ category, goals: list }) => (
                <View key={category?.id ?? 'none'} style={{ marginTop: space.lg }}>
                  {category
                    ? banner(
                        category.name,
                        list.length,
                        category.color,
                        contrastText(category.color)
                      )
                    : banner('Uncategorized', list.length, c.surfaceContainerHighest, c.onSurface)}
                  {list.map(renderRow)}
                </View>
              ))}
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

/** A weekly progress track that springs to `fraction` on mount and when it changes. */
function ProgressBar({ fraction, color }: { fraction: number; color: string }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, fraction));
  const width = useSharedValue(reduced ? target : 0);
  useEffect(() => {
    width.value = reduced ? target : withSpring(target, { damping: 18, stiffness: 120 });
  }, [target, reduced, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View
      style={{
        height: 8,
        borderRadius: radius.pill,
        backgroundColor: c.surfaceContainerHighest,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[{ height: 8, borderRadius: radius.pill, backgroundColor: color }, fill]}
      />
    </View>
  );
}
