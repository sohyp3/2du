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
import { useColors, useFontFamily, DISPLAY_FONT, radius, space, type } from '@/utils/theme';
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
const GroupGap = () => <View style={{ height: 20 }} />;
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
  const showGreeting = useThemeStore((s) => s.showGreeting);
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
  const empty = (
    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 48, alignItems: 'center' }}>
      <Text
        style={{
          color: c.onSurface,
          fontFamily: DISPLAY_FONT,
          ...type.title,
        }}>
        A little breathing room.
      </Text>
      <Text
        style={{
          color: c.onSurfaceVariant,
          fontFamily: fonts.regular,
          fontSize: 13,
          marginTop: 6,
          textAlign: 'center',
          lineHeight: 19,
        }}>
        Nothing here yet. Add something below,{'\n'}or give yourself a moment.
      </Text>
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
          <TimeFilter
            subtitle={
              visible.length
                ? `${completed} of ${visible.length} done`
                : showGreeting
                  ? 'Make room for today.'
                  : undefined
            }
          />
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
            <PressFeedback
              accessibilityRole="button"
              accessibilityLabel="Pick for me"
              onPress={() => router.push('/pick')}
              style={{
                minHeight: 52,
                minWidth: 52,
                paddingHorizontal: wide ? space.lg : 0,
                borderRadius: radius.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
                backgroundColor: c.surfaceContainer,
              }}>
              <Ionicons name="shuffle" size={20} color={c.primary} />
              {wide && (
                <Text style={{ fontFamily: fonts.medium, ...type.label, color: c.onSurface }}>
                  Pick for me
                </Text>
              )}
            </PressFeedback>
          </View>
        </View>
        {wide && !zen && (
          <View
            style={{
              width: 300,
              paddingHorizontal: 24,
              paddingTop: 32,
              borderLeftWidth: StyleSheet.hairlineWidth,
              borderLeftColor: c.outlineVariant,
            }}>
            <Text
              style={{
                fontFamily: DISPLAY_FONT,
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
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: c.outlineVariant,
                }}>
                <Text
                  numberOfLines={2}
                  style={{ fontFamily: fonts.medium, color: c.onSurface, fontSize: 14 }}>
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
              </PressFeedback>
            ))}
            <PressFeedback
              accessibilityRole="button"
              onPress={() => router.navigate('/notes')}
              style={{ minHeight: 48, justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 13 }}>
                Open your notebook →
              </Text>
            </PressFeedback>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
