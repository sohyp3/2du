import { useThemeStore } from '@/store/themeStore';
import { useEffect, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { localDateKey } from '@/shared/localDate';
import { useTodoStore } from '@/store/todoStore';
import { useNoteStore } from '@/store/noteStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  useColors,
  useFontFamily,
  DISPLAY_FONT,
  DISPLAY_FONT_SEMI,
  radius,
  space,
  type,
} from '@/utils/theme';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TodoItem } from '@/components/TodoItem';
import { CalendarCard, type CalendarCardProps } from '@/components/CalendarCard';
import { QuickAdd } from '@/components/QuickAdd';
import { TimeFilter } from '@/components/TimeFilter';
import { CalendarPicker } from '@/components/CalendarPicker';
import { BriefCard } from '@/components/BriefCard';
import { PressFeedback } from '@/components/PressFeedback';
import { FocusPill } from '@/components/FocusPill';
import type { Note } from '@/db/notes';
import type { Todo } from '@/db/todos';
const EMPTY_NOTES: Note[] = [];
const renderTodo = ({ item }: { item: Todo }) => <TodoItem todo={item} />;
const todoKey = (t: Todo) => t.id;
type CalendarGroup = CalendarCardProps;
const renderGroup = ({ item }: { item: CalendarGroup }) => (
  <CalendarCard calendar={item.calendar} todos={item.todos} />
);
const groupKey = (g: CalendarGroup) => g.calendar.id;
const GroupGap = () => <View style={{ height: space.md }} />;
const FILL = { duration: 500, dampingRatio: 0.8 };

function timeOfDay(hour: number) {
  if (hour < 12) return { emoji: '☀️', greeting: 'Good morning' };
  if (hour < 18) return { emoji: '🌤', greeting: 'Good afternoon' };
  return { emoji: '🌙', greeting: 'Good evening' };
}

/** The accent hero: what is left, what is done, a progress bar, and "Pick for me". */
function TodayHero({
  todo,
  done,
  doneLabel,
  onPick,
}: {
  todo: number;
  done: number;
  doneLabel: string;
  onPick: () => void;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  // The accent card's ink: the pill is filled with it, so it reads as a white pill.
  const ink = c.onPrimary;
  const reduced = useReducedMotion();
  const total = todo + done;
  const ratio = total ? done / total : 0;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(reduced ? ratio : withSpring(ratio, FILL));
  }, [progress, ratio, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const stat = (n: number, label: string) => (
    <View style={{ minWidth: 0 }}>
      <Text style={{ fontFamily: DISPLAY_FONT, fontSize: 44, lineHeight: 48, color: ink }}>
        {n}
      </Text>
      <Text style={{ fontFamily: fonts.bold, ...type.label, color: ink, opacity: 0.85 }}>
        {label}
      </Text>
    </View>
  );
  return (
    <Card tone="accent" style={{ marginTop: space.xs, marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xl }}>
        {stat(todo, 'to do')}
        {stat(done, doneLabel)}
        <View style={{ flex: 1 }} />
        <PressFeedback
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel="Pick for me"
          onPress={onPick}
          style={{
            minHeight: 44,
            paddingHorizontal: space.lg,
            borderRadius: radius.pill,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.xs + 2,
            backgroundColor: ink,
          }}>
          <Ionicons name="shuffle" size={18} color={c.primary} />
          <Text style={{ fontFamily: fonts.bold, ...type.label, color: c.primary }}>
            Pick for me
          </Text>
        </PressFeedback>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: done }}
        style={{ height: 6, borderRadius: 3, marginTop: space.lg, overflow: 'hidden' }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: ink, opacity: 0.25 }]} />
        <Animated.View
          style={[
            { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: ink },
            { borderRadius: 3 },
            fillStyle,
          ]}
        />
      </View>
    </Card>
  );
}
export default function TasksScreen() {
  const todos = useTodoStore((s) => s.todos),
    error = useTodoStore((s) => s.error),
    loadTodos = useTodoStore((s) => s.loadTodos);
  const selected = useCalendarsStore((s) => s.selected);
  const calendars = useCalendarsStore((s) => s.calendars);
  const groupByCalendar = useThemeStore((s) => s.groupByCalendar);
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const zen = useThemeStore((s) => s.zenMode);
  const showBrief = useTodoStore(
    (s) => s.period === 'day' && localDateKey(s.referenceDate) === localDateKey(new Date())
  );
  const isToday = useTodoStore((s) => localDateKey(s.referenceDate) === localDateKey(new Date()));
  const period = useTodoStore((s) => s.period),
    statusFilter = useTodoStore((s) => s.statusFilter);
  const showGreeting = useThemeStore((s) => s.showGreeting);
  const { emoji, greeting } = timeOfDay(new Date().getHours());
  const wide = useWindowDimensions().width >= 1280;
  const notes = useNoteStore((s) => (wide && !zen ? s.notes : EMPTY_NOTES));
  useEffect(() => {
    // Startup already loaded the list; reloading here would only repaint the same rows.
    if (useTodoStore.getState().loaded) return;
    void loadTodos();
  }, [loadTodos]);
  const visible = useMemo(
    () => todos.filter((t) => !selected || (t.calendar_id || 'daily') === selected),
    [todos, selected]
  );
  const completed = useMemo(
    () => visible.filter((t) => t.status === 'completed').length,
    [visible]
  );
  // One card per calendar, in calendar order. Null means the flat list.
  const groups = useMemo(() => {
    if (!groupByCalendar || selected) return null;
    const known = new Set(calendars.map((cal) => cal.id));
    const byCalendar = new Map<string, Todo[]>();
    for (const todo of visible) {
      // Tasks without a calendar, or pointing at one that no longer exists, sit in Daily.
      const id = known.has(todo.calendar_id || 'daily') ? todo.calendar_id || 'daily' : 'daily';
      const list = byCalendar.get(id);
      if (list) list.push(todo);
      else byCalendar.set(id, [todo]);
    }
    const result: CalendarGroup[] = [];
    for (const calendar of calendars) {
      const list = byCalendar.get(calendar.id);
      if (list) result.push({ calendar, todos: list });
    }
    return result;
  }, [groupByCalendar, selected, calendars, visible]);
  // An empty Active list means everything left in the period is done.
  const allDone = statusFilter === 'active';
  const empty = (
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 48, alignItems: 'center' }}>
      <Text style={{ fontSize: 56, lineHeight: 68 }}>{allDone ? '🎉' : '🌱'}</Text>
      <Text
        style={{
          color: c.onSurface,
          fontFamily: DISPLAY_FONT_SEMI,
          ...type.title,
          marginTop: space.sm,
          textAlign: 'center',
        }}>
        {allDone ? 'All done. Nice work!' : 'Nothing here yet.'}
      </Text>
      <PressFeedback
        haptic="tap"
        accessibilityRole="button"
        onPress={() => router.push('/add-todo')}
        style={{
          marginTop: space.lg,
          minHeight: 48,
          paddingHorizontal: space.xl,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: c.primary,
        }}>
        <Ionicons name="add" size={20} color={c.onPrimary} />
        <Text style={{ fontFamily: fonts.bold, ...type.body, color: c.onPrimary }}>Add a task</Text>
      </PressFeedback>
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      // Android is edge-to-edge (Expo 54), so the window no longer resizes for the
      // keyboard; pad on both platforms so the quick-add input rides up with it.
      behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          width: '100%',
          maxWidth: 1500,
          alignSelf: 'center',
        }}>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            paddingHorizontal: wide ? 40 : 16,
          }}>
          <ScreenHeader emoji={emoji} title={showGreeting ? greeting : 'Tasks'} showSettings />
          <TodayHero
            todo={visible.length - completed}
            done={completed}
            doneLabel={
              period === 'day' && isToday
                ? 'done today'
                : period === 'day'
                  ? 'done'
                  : `done this ${period}`
            }
            onPick={() => router.push('/pick')}
          />
          <TimeFilter />
          <View style={{ marginTop: space.sm, marginBottom: space.xs }}>
            <CalendarPicker />
          </View>
          {showBrief && <BriefCard />}
          <FocusPill />
          {error && (
            <PressFeedback
              onPress={loadTodos}
              accessibilityRole="button"
              style={{ padding: 12, backgroundColor: c.errorContainer, borderRadius: 8 }}>
              <Text style={{ color: c.onErrorContainer }}>{error} · Retry</Text>
            </PressFeedback>
          )}
          {groups ? (
            <FlatList
              data={groups}
              keyExtractor={groupKey}
              renderItem={renderGroup}
              ItemSeparatorComponent={GroupGap}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 12, flexGrow: 1 }}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={empty}
            />
          ) : (
            <FlatList
              data={visible}
              keyExtractor={todoKey}
              renderItem={renderTodo}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12, flexGrow: 1 }}
              ListEmptyComponent={empty}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          )}
          <View
            style={{
              paddingTop: space.sm,
              paddingBottom: space.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
            }}>
            <View style={{ flex: 1 }}>
              <QuickAdd />
            </View>
          </View>
        </View>
        {wide && !zen && (
          <View
            style={{
              width: 320,
              paddingRight: 32,
              paddingLeft: space.sm,
              paddingTop: 32,
            }}>
            <Text
              style={{
                fontFamily: DISPLAY_FONT_SEMI,
                ...type.title,
                color: c.onSurface,
              }}>
              On your mind
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                color: c.onSurfaceVariant,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 4,
                marginBottom: 12,
              }}>
              Loose thoughts, ready when you are.
            </Text>
            {notes.slice(0, 4).map((n) => (
              <PressFeedback
                key={n.id}
                accessibilityRole="button"
                onPress={() => router.push(`/note/${n.id}`)}
                style={{ marginBottom: space.md }}>
                <Card>
                  <Text
                    numberOfLines={2}
                    style={{ fontFamily: fonts.bold, color: c.onSurface, ...type.body }}>
                    {n.title}
                  </Text>
                  <Text
                    numberOfLines={3}
                    style={{
                      fontFamily: fonts.regular,
                      color: c.onSurfaceVariant,
                      fontSize: 13,
                      lineHeight: 19,
                      marginTop: 4,
                    }}>
                    {n.content || 'An idea waiting to happen.'}
                  </Text>
                </Card>
              </PressFeedback>
            ))}
            <PressFeedback
              accessibilityRole="button"
              onPress={() => router.navigate('/notes')}
              style={{ minHeight: 48, justifyContent: 'center', marginTop: space.xs }}>
              <Text style={{ color: c.primary, fontFamily: fonts.bold, ...type.label }}>
                Open your notebook →
              </Text>
            </PressFeedback>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
