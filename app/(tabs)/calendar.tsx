import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarPicker } from '@/components/CalendarPicker';
import { useCalendarsStore } from '@/store/calendarsStore';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useColors, useFontFamily } from '@/utils/theme';
import { getTodosByDateRange, Todo } from '@/db/todos';
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

type CalendarView = 'day' | 'week' | 'month';

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

export default function CalendarScreen() {
  const c = useColors();
  const fonts = useFontFamily();
  const router = useRouter();
  const selectedCalendar = useCalendarsStore((s) => s.selected);
  const isFocused = useIsFocused();
  const revision = useCalendarsStore((s) => s.revision);
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
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of rangeTodos) {
      if (task.status === 'cancelled') continue;
      const key = toDateKey(new Date(task.datetime));
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [rangeTodos]);
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

  const toggleComplete = useCallback(
    async (id: string) => {
      await useTodoStore.getState().toggleComplete(id);
      await loadData();
    },
    [loadData]
  );

  useEffect(() => {
    if (isFocused) void loadData();
  }, [loadData, revision, isFocused]);

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

  const headerLabel = useMemo(() => {
    if (view === 'day') {
      if (isSameDay(selectedDate, today)) return 'Today';
      return selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    if (view === 'week') {
      const dates = getWeekDates(selectedDate);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(dates[0])} – ${fmt(dates[6])}`;
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [view, selectedDate, today]);

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
      <View className="px-6 pt-12">
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: 'PlayfairDisplay_400Regular',
            color: c.onSurface,
            fontSize: 36,
            marginBottom: 10,
          }}>
          A view of what’s ahead.
        </Text>
        <CalendarPicker />
        <View style={{ minHeight: 24, justifyContent: 'center' }}>
          {error ? (
            <Pressable accessibilityRole="button" onPress={loadData}>
              <Text accessibilityRole="alert" style={{ color: c.error, fontFamily: fonts.regular }}>
                {error} · Retry
              </Text>
            </Pressable>
          ) : isLoading ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: c.onSurfaceVariant, fontSize: 12 }}>
              Updating calendar…
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: 12, marginBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, color: c.onSurface, fontFamily: fonts.medium, fontSize: 16 }}>
              {headerLabel}
            </Text>
            {(['prev', 'next'] as const).map((dir) => (
              <Pressable
                key={dir}
                accessibilityRole="button"
                accessibilityLabel={
                  dir === 'prev' ? 'Previous calendar period' : 'Next calendar period'
                }
                onPress={() => navigate(dir)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.surfaceContainer,
                  borderRadius: 8,
                }}>
                <Ionicons
                  name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={c.onSurfaceVariant}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                backgroundColor: c.surfaceContainer,
                borderRadius: 10,
                padding: 4,
              }}>
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  accessibilityLabel={`${v} view`}
                  accessibilityState={{ selected: view === v }}
                  aria-selected={view === v}
                  onPress={() => setView(v)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: view === v ? c.surfaceContainerHighest : 'transparent',
                    borderRadius: 7,
                  }}>
                  <Text
                    style={{
                      color: view === v ? c.onSurface : c.onSurfaceVariant,
                      fontFamily: fonts.medium,
                      fontSize: 13,
                      textTransform: 'capitalize',
                    }}>
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              onPress={() => setSelectedDate(new Date())}
              style={{ minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' }}>
              <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 13 }}>
                Today
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Calendar body */}
      {view === 'month' && (
        <MonthView
          selectedDate={selectedDate}
          today={today}
          monthCounts={monthCounts}
          todos={todos}
          timeFormat={timeFormat}
          onSelectDate={(d) => setSelectedDate(d)}
          onTodoPress={(id) => router.push(`/todo/${id}`)}
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
          timeFormat={timeFormat}
          dayViewStartHour={dayViewStartHour}
          onTodoPress={(id) => router.push(`/todo/${id}`)}
          refreshing={refreshing}
          onRefresh={onRefresh}
          c={c}
          fonts={fonts}
        />
      )}

      {view === 'day' && (
        <DayView
          selectedDate={selectedDate}
          todosByHour={todosByHour}
          timeFormat={timeFormat}
          onTodoPress={(id) => router.push(`/todo/${id}`)}
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

// ─── Month View ──────────────────────────────────────────

function MonthView({
  selectedDate,
  today,
  monthCounts,
  todos,
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
  monthCounts: Record<string, number>;
  todos: Todo[];
  timeFormat: '12h' | '24h';
  onSelectDate: (d: Date) => void;
  onTodoPress: (id: string) => void;
  toggleComplete: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  c: ReturnType<typeof useColors>;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const weeks = useMemo(
    () => getMonthGrid(selectedDate.getFullYear(), selectedDate.getMonth()),
    [selectedDate]
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }>
      {/* Weekday headers */}
      <View className="flex-row px-4">
        {WEEKDAYS.map((d) => (
          <View key={d} className="flex-1 items-center py-1">
            <Text
              style={{ fontFamily: fonts.bold, color: c.outline }}
              className="text-xs uppercase">
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View className="px-4">
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row">
            {week.map((day, di) => {
              if (!day) return <View key={di} className="flex-1 p-1" />;
              const key = toDateKey(day);
              const count = monthCounts[key] || 0;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              return (
                <Pressable
                  key={di}
                  accessibilityRole="button"
                  accessibilityLabel={day.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  accessibilityState={{ selected: isSameDay(day, selectedDate) }}
                  aria-selected={isSameDay(day, selectedDate)}
                  style={{ minHeight: 48 }}
                  onPress={() => onSelectDate(day)}
                  className="flex-1 items-center p-1">
                  <View
                    style={[
                      isSelected
                        ? { backgroundColor: c.primary }
                        : isToday
                          ? { backgroundColor: c.surfaceContainerHigh }
                          : undefined,
                    ]}
                    className="h-9 w-9 items-center justify-center rounded-full">
                    <Text
                      style={{
                        fontFamily: isSelected || isToday ? fonts.bold : fonts.regular,
                        color: isSelected ? c.onPrimary : isToday ? c.primary : c.onSurface,
                      }}
                      className="text-sm">
                      {day.getDate()}
                    </Text>
                  </View>
                  {count > 0 && (
                    <View className="mt-0.5 flex-row gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <View
                          key={i}
                          style={{ backgroundColor: c.primary }}
                          className="h-1 w-1 rounded-full"
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected day's todos */}
      <View className="mt-2 px-4">
        <Text
          style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
          className="mb-2 text-xs uppercase tracking-[2px]">
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        {todos.length === 0 ? (
          <Text
            style={{ fontFamily: fonts.regular, color: c.outline }}
            className="py-4 text-center text-sm">
            No todos
          </Text>
        ) : (
          todos.map((item) => (
            <TodoRow
              key={item.id}
              todo={item}
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

// ─── Week View ───────────────────────────────────────────

function WeekView({
  selectedDate,
  today,
  todosByHour,
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
  timeFormat: '12h' | '24h';
  dayViewStartHour: number;
  onTodoPress: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  c: ReturnType<typeof useColors>;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const hours = useMemo(() => getDayHours(dayViewStartHour), [dayViewStartHour]);
  const is24h = timeFormat === '24h';

  return (
    <View className="flex-1">
      {/* Sticky day header */}
      <View className="flex-row px-1 pb-2" style={{ borderColor: c.outlineVariant }}>
        <View className="w-11" />
        {weekDates.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <View key={i} className="flex-1 items-center">
              <Text
                style={{
                  fontFamily: fonts.medium,
                  color: isToday ? c.primary : c.outline,
                }}
                className="text-[10px] uppercase">
                {WEEKDAYS[i]}
              </Text>
              <View
                style={isToday ? { backgroundColor: c.primary } : undefined}
                className={`mt-0.5 h-7 w-7 items-center justify-center rounded-full`}>
                <Text
                  style={{
                    fontFamily: isToday ? fonts.bold : fonts.regular,
                    color: isToday ? c.onPrimary : c.onSurface,
                  }}
                  className="text-sm">
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
        keyExtractor={(h) => String(h)}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
        renderItem={({ item: hour }) => (
          <View className="flex-row" style={{ minHeight: 44 }}>
            <View className="w-11 items-end justify-start pr-1.5 pt-0.5">
              <Text style={{ fontFamily: fonts.regular, color: c.outline }} className="text-[10px]">
                {formatHour(hour, is24h)}
              </Text>
            </View>
            {weekDates.map((d, i) => {
              const key = `${toDateKey(d)}-${hour}`;
              const items = todosByHour[key] || [];
              return (
                <View
                  key={i}
                  className="flex-1 border-l border-t px-0.5 py-0.5"
                  style={{ borderColor: c.outlineVariant }}>
                  {items.map((t) => {
                    const isCompleted = t.status === 'completed';
                    return (
                      <Pressable
                        key={t.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${t.name}`}
                        onPress={() => onTodoPress(t.id)}
                        style={{
                          minHeight: 48,
                          backgroundColor: isCompleted
                            ? c.surfaceContainerHigh
                            : c.primaryContainer,
                        }}
                        className="mb-0.5 rounded px-1 py-0.5">
                        <Text
                          style={{
                            fontFamily: fonts.medium,
                            color: isCompleted ? c.onSurfaceVariant : c.onSurface,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                          }}
                          className="text-[10px]"
                          numberOfLines={1}>
                          {t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
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
  todosByHour,
  timeFormat,
  onTodoPress,
  dayViewStartHour,
  refreshing,
  onRefresh,
  c,
  fonts,
}: {
  selectedDate: Date;
  todosByHour: Record<string, Todo[]>;
  timeFormat: '12h' | '24h';
  onTodoPress: (id: string) => void;
  dayViewStartHour: number;
  refreshing: boolean;
  onRefresh: () => void;
  c: ReturnType<typeof useColors>;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const hours = useMemo(() => getDayHours(dayViewStartHour), [dayViewStartHour]);

  return (
    <FlatList
      data={hours}
      keyExtractor={(h) => String(h)}
      contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
      renderItem={({ item: hour }) => {
        const items = todosByHour[String(hour)] || [];
        return (
          <View
            className="flex-row border-b py-1"
            style={{ borderColor: c.outlineVariant, minHeight: 48 }}>
            <View className="w-16 items-end pr-3 pt-1">
              <Text style={{ fontFamily: fonts.regular, color: c.outline }} className="text-xs">
                {formatHour(hour, timeFormat === '24h')}
              </Text>
            </View>
            <View className="flex-1">
              {items.map((t) => {
                const isCompleted = t.status === 'completed';
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${t.name}`}
                    onPress={() => onTodoPress(t.id)}
                    style={{
                      minHeight: 48,
                      backgroundColor: isCompleted ? c.surfaceContainerLow : c.primaryContainer,
                    }}
                    className="mb-1 rounded-md px-3 py-2">
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: isCompleted ? c.onSurfaceVariant : c.onSurface,
                      }}
                      className="text-sm">
                      {t.name}
                    </Text>
                    <Text
                      style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}
                      className="text-xs">
                      {formatTime(t.datetime, timeFormat === '24h')}
                      {t.time_needed ? ` · ${t.time_needed}m` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }}
    />
  );
}

// ─── Todo Row (for month selected day list) ──────────────

function TodoRow({
  todo,
  timeFormat,
  onPress,
  toggleComplete,
  c,
  fonts,
}: {
  todo: Todo;
  timeFormat: '12h' | '24h';
  onPress: (id: string) => void;
  toggleComplete: (id: string) => void;
  c: ReturnType<typeof useColors>;
  fonts: ReturnType<typeof useFontFamily>;
}) {
  const isCompleted = todo.status === 'completed';
  return (
    <View
      style={{
        backgroundColor: c.surfaceContainer,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: isCompleted }}
        aria-checked={isCompleted}
        onPress={() => toggleComplete(todo.id)}
        style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isCompleted ? c.primary : c.outline}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${todo.name}`}
        onPress={() => onPress(todo.id)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingRight: 12,
        }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.medium,
            color: isCompleted ? c.onSurfaceVariant : c.onSurface,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
            fontSize: 14,
            lineHeight: 22,
          }}>
          {todo.name}
        </Text>
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 }}>
          {formatTime(todo.datetime, timeFormat === '24h')}
        </Text>
      </Pressable>
    </View>
  );
}
