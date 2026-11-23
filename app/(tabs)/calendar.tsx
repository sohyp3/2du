import { ScreenHeader } from '@/components/ScreenHeader';
import { ColorChip, Segmented } from '@/components/Chip';
import { Card } from '@/components/Card';
import { PressFeedback } from '@/components/PressFeedback';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarPicker } from '@/components/CalendarPicker';
import { useCalendarsStore } from '@/store/calendarsStore';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { contrastText } from '@/utils/palette';
import * as haptics from '@/utils/haptics';
import { getTodosByDateRange, Todo } from '@/db/todos';
import type { Calendar } from '@/db/calendars';
import {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  formatTime,
} from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { DatabaseError } from '@/db/database';
import { playTing } from '@/utils/ting';
import { useThemeStore } from '@/store/themeStore';
import { useSyncStore } from '@/store/syncStore';

type CalendarView = 'day' | 'week' | 'month';
const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: CalendarView; label: string }[];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const dayOfWeek = first.getDay();
  // Monday=0 offset
  const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function getWeekDates(date: Date): Date[] {
  const start = getStartOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getDayHours(startHour: number) {
  const hours: number[] = [];
  for (let i = 0; i < 24; i++) {
    hours.push((startHour + i) % 24);
  }
  return hours;
}

function formatHour(hour: number, is24h: boolean) {
  if (is24h) {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

type Colors = ReturnType<typeof useColors>;

const roundButton = (c: Colors): ViewStyle => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: c.surfaceContainer,
});

const MAX_BARS = 3;

/** The current time, refreshed every minute, for the "now" line. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** A primary line across an hour cell at the current minute. */
function NowLine({ now, c }: { now: Date; c: Colors }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${(now.getMinutes() / 60) * 100}%`,
        height: 2,
        backgroundColor: c.primary,
        zIndex: 1,
      }}>
      <View
        style={{
          position: 'absolute',
          left: -4,
          top: -3,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: c.primary,
        }}
      />
    </View>
  );
}

/** A solid event block in its calendar colour; completed ones fade and are struck through. */
function EventBlock({
  todo,
  color,
  onPress,
  compact,
  meta,
  fonts,
}: {
  todo: Todo;
  color: string;
  onPress: (id: string) => void;
  compact?: boolean;
  meta?: string;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const done = todo.status === 'completed';
  const ink = contrastText(color);
  const strike = done ? 'line-through' : 'none';
  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={`Open ${todo.name}`}
      onPress={() => onPress(todo.id)}
      style={{
        minHeight: compact ? 28 : 40,
        marginBottom: 2,
        borderRadius: radius.sm,
        backgroundColor: color,
        opacity: done ? 0.35 : 1,
        justifyContent: 'center',
        paddingHorizontal: compact ? space.xs : space.md,
        paddingVertical: compact ? 2 : space.xs + 2,
      }}>
      <Text
        numberOfLines={compact ? 1 : undefined}
        style={{
          fontFamily: fonts.bold,
          color: ink,
          textDecorationLine: strike,
          ...(compact ? { fontSize: 10, lineHeight: 13 } : type.label),
        }}>
        {todo.name}
      </Text>
      {meta ? (
        <Text
          style={{
            fontFamily: fonts.medium,
            color: ink,
            textDecorationLine: strike,
            ...type.caption,
          }}>
          {meta}
        </Text>
      ) : null}
    </PressFeedback>
  );
}

export default function CalendarScreen() {
  const showGreeting = useThemeStore((st) => st.showGreeting);
  const c = useColors();
  const fonts = useFontFamily();
  const router = useRouter();
  const selectedCalendar = useCalendarsStore((s) => s.selected);
  const calendars = useCalendarsStore((s) => s.calendars);
  const selectCalendar = useCalendarsStore((s) => s.select);
  const colorOf = useCallback(
    (t: Todo) => calendars.find((k) => k.id === (t.calendar_id || 'daily'))?.color ?? c.primary,
    [calendars, c.primary]
  );
  const isFocused = useIsFocused();
  const revision = useCalendarsStore((s) => s.revision);
  const syncRevision = useSyncStore((s) => s.revision);
  const filterTasks = useCallback(
    (items: Todo[]) =>
      items.filter((t) => !selectedCalendar || (t.calendar_id || 'daily') === selectedCalendar),
    [selectedCalendar]
  );
  const dayViewStartHour = useCalendarStore((s) => s.dayViewStartHour);
  const timeFormat = useCalendarStore((s) => s.timeFormat);

  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const [rangeTodos, setRangeTodos] = useState<Todo[]>([]);
  const requestId = useRef(0);
  const start =
    view === 'month'
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : view === 'week'
        ? getStartOfWeek(selectedDate)
        : getStartOfDay(selectedDate);
  const end =
    view === 'month'
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999)
      : view === 'week'
        ? getEndOfWeek(selectedDate)
        : getEndOfDay(selectedDate);
  const startISO = start.toISOString(),
    endISO = end.toISOString();
  const selectedKey = toDateKey(selectedDate);
  const todos = useMemo(
    () =>
      view === 'month'
        ? rangeTodos.filter((t) => toDateKey(new Date(t.datetime)) === selectedKey)
        : rangeTodos,
    [rangeTodos, view, selectedKey]
  );
  const monthDots = useMemo(() => {
    const dots: Record<string, string[]> = {};
    for (const task of rangeTodos) {
      if (task.status === 'cancelled') continue;
      (dots[toDateKey(new Date(task.datetime))] ||= []).push(colorOf(task));
    }
    return dots;
  }, [rangeTodos, colorOf]);
  const loadData = useCallback(async () => {
    const request = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTodosByDateRange(startISO, endISO);
      if (request === requestId.current) setRangeTodos(filterTasks(result));
    } catch (err) {
      if (request === requestId.current)
        setError(err instanceof DatabaseError ? err.message : 'Failed to load calendar data');
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [startISO, endISO, filterTasks]);

  // Flip the checkbox immediately; the store persists it and reverts on failure.
  const toggleComplete = useCallback(async (id: string) => {
    const flip = (t: Todo): Todo =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t;
    setRangeTodos((items) => items.map(flip));
    if (!(await useTodoStore.getState().toggleComplete(id)))
      setRangeTodos((items) => items.map(flip));
  }, []);
  const openTodo = useCallback((id: string) => router.push(`/todo/${id}`), [router]);

  useEffect(() => {
    if (isFocused) void loadData();
  }, [loadData, revision, syncRevision, isFocused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const navigate = useCallback(
    (dir: 'prev' | 'next') => {
      setSelectedDate((prev) => {
        const d = new Date(prev);
        const offset = dir === 'next' ? 1 : -1;
        if (view === 'day') d.setDate(d.getDate() + offset);
        else if (view === 'week') d.setDate(d.getDate() + offset * 7);
        else {
          const day = d.getDate();
          d.setDate(1);
          d.setMonth(d.getMonth() + offset);
          d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        }
        return d;
      });
    },
    [view]
  );

  // Phones get short labels so the display-size title fits beside the settings gear.
  const compact = useWindowDimensions().width < 600;
  const headerLabel = useMemo(() => {
    if (view === 'day') {
      if (isSameDay(selectedDate, today)) return 'Today';
      return selectedDate.toLocaleDateString('en-US', {
        weekday: compact ? 'short' : 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    if (view === 'week') {
      const dates = getWeekDates(selectedDate);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!compact) return `${fmt(dates[0])} – ${fmt(dates[6])}`;
      const sameMonth = dates[0].getMonth() === dates[6].getMonth();
      return `${fmt(dates[0])}–${sameMonth ? dates[6].getDate() : fmt(dates[6])}`;
    }
    return selectedDate.toLocaleDateString('en-US', {
      month: compact ? 'short' : 'long',
      year: 'numeric',
    });
  }, [view, selectedDate, today, compact]);

  // Group todos by hour for day view, or by day+hour for week view
  const todosByHour = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    for (const t of todos) {
      const d = new Date(t.datetime);
      const key = view === 'week' ? `${toDateKey(d)}-${d.getHours()}` : `${d.getHours()}`;
      (map[key] ||= []).push(t);
    }
    return map;
  }, [todos, view]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        maxWidth: 1500,
        width: '100%',
        alignSelf: 'center',
      }}>
      <View style={{ paddingHorizontal: space.lg }}>
        <ScreenHeader
          title={headerLabel}
          emoji="📅"
          showSettings
          subtitle={showGreeting ? 'A view of what’s ahead.' : undefined}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
          }}>
          <Segmented options={VIEWS} value={view} onChange={setView} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <PressFeedback
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel="Previous calendar period"
              onPress={() => navigate('prev')}
              style={roundButton(c)}>
              <Ionicons name="chevron-back" size={18} color={c.onSurface} />
            </PressFeedback>
            <PressFeedback
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              onPress={() => setSelectedDate(new Date())}
              style={{
                height: 40,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                justifyContent: 'center',
                backgroundColor: c.primary,
              }}>
              <Text style={{ color: c.onPrimary, fontFamily: fonts.bold, ...type.label }}>
                Today
              </Text>
            </PressFeedback>
            <PressFeedback
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel="Next calendar period"
              onPress={() => navigate('next')}
              style={roundButton(c)}>
              <Ionicons name="chevron-forward" size={18} color={c.onSurface} />
            </PressFeedback>
          </View>
        </View>
        <View style={{ marginTop: space.sm }}>
          <CalendarPicker />
        </View>
        <View style={{ minHeight: 16, justifyContent: 'center' }}>
          {error ? (
            <PressFeedback accessibilityRole="button" onPress={loadData}>
              <Text accessibilityRole="alert" style={{ color: c.error, fontFamily: fonts.regular }}>
                {error} · Retry
              </Text>
            </PressFeedback>
          ) : isLoading && !rangeTodos.length ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: c.onSurfaceVariant, fontSize: 12 }}>
              Updating calendar…
            </Text>
          ) : null}
        </View>
        <View style={{ marginBottom: 8 }}>
          <Overview
            todos={rangeTodos}
            calendars={selectedCalendar ? [] : calendars}
            onSelectCalendar={selectCalendar}
            isLoading={isLoading}
            c={c}
            fonts={fonts}
          />
        </View>
      </View>

      {/* Calendar body */}
      {view === 'month' && (
        <MonthView
          selectedDate={selectedDate}
          today={today}
          monthDots={monthDots}
          todos={todos}
          colorOf={colorOf}
          timeFormat={timeFormat}
          onSelectDate={setSelectedDate}
          onTodoPress={openTodo}
          toggleComplete={toggleComplete}
          refreshing={refreshing}
          onRefresh={onRefresh}
          c={c}
          fonts={fonts}
        />
      )}

      {view === 'week' && (
        <WeekView
          selectedDate={selectedDate}
          today={today}
          todosByHour={todosByHour}
          colorOf={colorOf}
          timeFormat={timeFormat}
          dayViewStartHour={dayViewStartHour}
          onTodoPress={openTodo}
          refreshing={refreshing}
          onRefresh={onRefresh}
          c={c}
          fonts={fonts}
        />
      )}

      {view === 'day' && (
        <DayView
          selectedDate={selectedDate}
          today={today}
          todosByHour={todosByHour}
          colorOf={colorOf}
          timeFormat={timeFormat}
          onTodoPress={openTodo}
          dayViewStartHour={dayViewStartHour}
          refreshing={refreshing}
          onRefresh={onRefresh}
          c={c}
          fonts={fonts}
        />
      )}
    </View>
  );
}

// ─── Overview ────────────────────────────────────────────

function Overview({
  todos,
  calendars,
  onSelectCalendar,
  isLoading,
  c,
  fonts,
}: {
  todos: Todo[];
  calendars: Calendar[];
  onSelectCalendar: (id: string) => void;
  isLoading: boolean;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const { left, done, overdue, perCalendar } = useMemo(() => {
    const now = Date.now();
    const stats = { left: 0, done: 0, overdue: 0, perCalendar: {} as Record<string, number> };
    for (const t of todos) {
      if (t.status === 'cancelled') continue;
      if (t.status === 'completed') stats.done++;
      else {
        stats.left++;
        if (new Date(t.datetime).getTime() < now) stats.overdue++;
      }
      const id = t.calendar_id || 'daily';
      stats.perCalendar[id] = (stats.perCalendar[id] || 0) + 1;
    }
    return stats;
  }, [todos]);
  const labelStyle = { fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.label };

  return (
    <View
      style={{
        minHeight: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: space.sm,
        rowGap: space.xs,
      }}>
      {left + done === 0 ? (
        !isLoading && <Text style={labelStyle}>Nothing scheduled</Text>
      ) : (
        <>
          <Text style={[labelStyle, { marginRight: space.xs }]}>
            <Text style={{ fontFamily: fonts.bold, color: c.onSurface }}>{left} left</Text>
            {` · ${done} done`}
            {overdue > 0 && <Text style={{ color: c.error }}>{` · ${overdue} overdue`}</Text>}
          </Text>
          {calendars
            .filter((k) => perCalendar[k.id])
            .map((k) => (
              <ColorChip
                key={k.id}
                label={`${k.name} ${perCalendar[k.id]}`}
                color={k.color}
                selected={false}
                onPress={() => onSelectCalendar(k.id)}
              />
            ))}
        </>
      )}
    </View>
  );
}

// ─── Month View ──────────────────────────────────────────

function MonthView({
  selectedDate,
  today,
  monthDots,
  todos,
  colorOf,
  timeFormat,
  onSelectDate,
  onTodoPress,
  toggleComplete,
  refreshing,
  onRefresh,
  c,
  fonts,
}: {
  selectedDate: Date;
  today: Date;
  monthDots: Record<string, string[]>;
  todos: Todo[];
  colorOf: (t: Todo) => string;
  timeFormat: '12h' | '24h';
  onSelectDate: (d: Date) => void;
  onTodoPress: (id: string) => void;
  toggleComplete: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }>
      {/* Weekday headers */}
      <View style={{ flexDirection: 'row', paddingHorizontal: space.lg }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: space.xs }}>
            <Text
              style={{
                fontFamily: fonts.bold,
                color: c.outline,
                textTransform: 'uppercase',
                ...type.caption,
              }}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <MonthGrid
        selectedDate={selectedDate}
        today={today}
        monthDots={monthDots}
        onSelectDate={onSelectDate}
        c={c}
        fonts={fonts}
      />

      {/* Selected day's todos */}
      <View style={{ marginTop: space.lg, paddingHorizontal: space.lg }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            color: c.onSurfaceVariant,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: space.sm,
            ...type.caption,
          }}>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        {todos.length === 0 ? (
          <Text
            style={{
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              textAlign: 'center',
              paddingVertical: space.lg,
              ...type.label,
            }}>
            No todos
          </Text>
        ) : (
          todos.map((item) => (
            <TodoRow
              key={item.id}
              todo={item}
              color={colorOf(item)}
              timeFormat={timeFormat}
              onPress={onTodoPress}
              toggleComplete={toggleComplete}
              c={c}
              fonts={fonts}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const MonthGrid = memo(function MonthGrid({
  selectedDate,
  today,
  monthDots,
  onSelectDate,
  c,
  fonts,
}: {
  selectedDate: Date;
  today: Date;
  monthDots: Record<string, string[]>;
  onSelectDate: (d: Date) => void;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const year = selectedDate.getFullYear(),
    month = selectedDate.getMonth();
  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);
  return (
    <View style={{ paddingHorizontal: space.lg, gap: 2 }}>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: 2 }}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={{ flex: 1 }} />;
            const key = toDateKey(day);
            const bars = monthDots[key] || [];
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selectedDate);
            return (
              <PressFeedback
                key={di}
                accessibilityRole="button"
                accessibilityLabel={day.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDate(day)}
                style={{
                  flex: 1,
                  minHeight: 52,
                  alignItems: 'center',
                  paddingVertical: space.xs,
                  borderRadius: radius.md,
                  backgroundColor: isSelected ? c.accentSoft : 'transparent',
                }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? c.primary : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontFamily: isSelected || isToday ? fonts.bold : fonts.regular,
                      color: isToday ? c.onPrimary : c.onSurface,
                      ...type.label,
                    }}>
                    {day.getDate()}
                  </Text>
                </View>
                {bars.length > 0 && (
                  <View
                    style={{
                      marginTop: 3,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      height: 10,
                    }}>
                    {bars.slice(0, MAX_BARS).map((color, i) => (
                      <View
                        key={i}
                        style={{ width: 8, height: 4, borderRadius: 2, backgroundColor: color }}
                      />
                    ))}
                    {bars.length > MAX_BARS && (
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          color: c.onSurfaceVariant,
                          fontSize: 9,
                          lineHeight: 10,
                        }}>
                        +{bars.length - MAX_BARS}
                      </Text>
                    )}
                  </View>
                )}
              </PressFeedback>
            );
          })}
        </View>
      ))}
    </View>
  );
});

// ─── Week View ───────────────────────────────────────────

function WeekView({
  selectedDate,
  today,
  todosByHour,
  colorOf,
  timeFormat,
  dayViewStartHour,
  onTodoPress,
  refreshing,
  onRefresh,
  c,
  fonts,
}: {
  selectedDate: Date;
  today: Date;
  todosByHour: Record<string, Todo[]>;
  colorOf: (t: Todo) => string;
  timeFormat: '12h' | '24h';
  dayViewStartHour: number;
  onTodoPress: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const hours = useMemo(() => getDayHours(dayViewStartHour), [dayViewStartHour]);
  const is24h = timeFormat === '24h';
  const now = useNow();

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky day header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: space.xs, paddingBottom: space.sm }}>
        <View style={{ width: 44 }} />
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  color: isToday ? c.primary : c.outline,
                  textTransform: 'uppercase',
                  fontSize: 10,
                  lineHeight: 13,
                }}>
                {WEEKDAYS[i]}
              </Text>
              <View
                style={{
                  marginTop: 2,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isToday ? c.primary : 'transparent',
                }}>
                <Text
                  style={{
                    fontFamily: isToday ? fonts.bold : fonts.regular,
                    color: isToday ? c.onPrimary : c.onSurface,
                    ...type.label,
                  }}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Hourly grid */}
      <FlatList
        data={hours}
        extraData={now}
        keyExtractor={(h) => String(h)}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: space.xs }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
        renderItem={({ item: hour }) => (
          <View style={{ flexDirection: 'row', minHeight: 44 }}>
            <View style={{ width: 44, alignItems: 'flex-end', paddingRight: 6, paddingTop: 2 }}>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  color: c.onSurfaceVariant,
                  fontSize: 10,
                  lineHeight: 13,
                }}>
                {formatHour(hour, is24h)}
              </Text>
            </View>
            {weekDates.map((d, i) => {
              const key = `${toDateKey(d)}-${hour}`;
              const items = todosByHour[key] || [];
              const nowHere = isSameDay(d, now) && now.getHours() === hour;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    borderLeftWidth: 1,
                    borderTopWidth: 1,
                    borderColor: c.outlineVariant,
                    padding: 1,
                  }}>
                  {nowHere && <NowLine now={now} c={c} />}
                  {items.map((t) => (
                    <EventBlock
                      key={t.id}
                      todo={t}
                      color={colorOf(t)}
                      onPress={onTodoPress}
                      compact
                      fonts={fonts}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        )}
      />
    </View>
  );
}

// ─── Day View ────────────────────────────────────────────

function DayView({
  selectedDate,
  today,
  todosByHour,
  colorOf,
  timeFormat,
  onTodoPress,
  dayViewStartHour,
  refreshing,
  onRefresh,
  c,
  fonts,
}: {
  selectedDate: Date;
  today: Date;
  todosByHour: Record<string, Todo[]>;
  colorOf: (t: Todo) => string;
  timeFormat: '12h' | '24h';
  onTodoPress: (id: string) => void;
  dayViewStartHour: number;
  refreshing: boolean;
  onRefresh: () => void;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const hours = useMemo(() => getDayHours(dayViewStartHour), [dayViewStartHour]);
  const now = useNow();
  const isToday = isSameDay(selectedDate, today) && isSameDay(selectedDate, now);

  return (
    <FlatList
      data={hours}
      extraData={now}
      keyExtractor={(h) => String(h)}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: space.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
      renderItem={({ item: hour }) => {
        const items = todosByHour[String(hour)] || [];
        return (
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderColor: c.outlineVariant,
              minHeight: 48,
            }}>
            <View
              style={{ width: 56, alignItems: 'flex-end', paddingRight: space.md, paddingTop: 4 }}>
              <Text
                style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.caption }}>
                {formatHour(hour, timeFormat === '24h')}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingVertical: 2 }}>
              {isToday && now.getHours() === hour && <NowLine now={now} c={c} />}
              {items.map((t) => (
                <EventBlock
                  key={t.id}
                  todo={t}
                  color={colorOf(t)}
                  onPress={onTodoPress}
                  meta={`${formatTime(t.datetime, timeFormat === '24h')}${
                    t.time_needed ? ` · ${t.time_needed}m` : ''
                  }`}
                  fonts={fonts}
                />
              ))}
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Todo Row (for month selected day list) ──────────────

const BOX = 28;
const POP = { duration: 220, dampingRatio: 0.5 };
const SETTLE = { duration: 260, dampingRatio: 0.7 };

// Same look as `TodoItem` on the Tasks screen, but completion flips this screen's local list.
function TodoRow({
  todo,
  color,
  timeFormat,
  onPress,
  toggleComplete,
  c,
  fonts,
}: {
  todo: Todo;
  color: string;
  timeFormat: '12h' | '24h';
  onPress: (id: string) => void;
  toggleComplete: (id: string) => void;
  c: Colors;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const done = todo.status === 'completed';
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const complete = () => {
    if (!done) {
      void playTing();
      haptics.success();
      if (!reduced) scale.set(withSequence(withSpring(1.25, POP), withSpring(1, SETTLE)));
    }
    toggleComplete(todo.id);
  };
  return (
    <Card
      padded={false}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 56,
        marginBottom: space.sm,
        paddingLeft: space.sm,
      }}>
      <PressFeedback
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: done }}
        onPress={complete}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              width: BOX,
              height: BOX,
              borderRadius: BOX / 2,
              borderWidth: 2,
              borderColor: color,
              backgroundColor: done ? color : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            },
            boxStyle,
          ]}>
          {done && <Ionicons name="checkmark" size={18} color={contrastText(color)} />}
        </Animated.View>
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Open ${todo.name}`}
        onPress={() => onPress(todo.id)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: space.md,
          paddingLeft: space.xs,
          paddingRight: space.lg,
        }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.bold,
            ...type.body,
            color: done ? c.onSurfaceVariant : c.onSurface,
            textDecorationLine: done ? 'line-through' : 'none',
            textDecorationColor: c.onSurfaceVariant,
          }}>
          {todo.name}
        </Text>
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.caption }}>
          {formatTime(todo.datetime, timeFormat === '24h')}
        </Text>
      </PressFeedback>
    </Card>
  );
}
