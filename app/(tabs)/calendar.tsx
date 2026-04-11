import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, useFontFamily } from '@/utils/theme';
import { getTodosByDateRange, getTodoCountsByMonth, Todo } from '@/db/todos';
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
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const dayViewStartHour = useCalendarStore((s) => s.dayViewStartHour);
  const timeFormat = useCalendarStore((s) => s.timeFormat);

  const [view, setView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  // Todos for selected range
  const [todos, setTodos] = useState<Todo[]>([]);
  const [monthCounts, setMonthCounts] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (view === 'month') {
        const counts = await getTodoCountsByMonth(
          selectedDate.getFullYear(),
          selectedDate.getMonth()
        );
        setMonthCounts(counts);
        // Also load todos for the selected day
        const start = getStartOfDay(selectedDate);
        const end = getEndOfDay(selectedDate);
        const dayTodos = await getTodosByDateRange(start.toISOString(), end.toISOString());
        setTodos(dayTodos);
      } else if (view === 'week') {
        const start = getStartOfWeek(selectedDate);
        const end = getEndOfWeek(selectedDate);
        const weekTodos = await getTodosByDateRange(start.toISOString(), end.toISOString());
        setTodos(weekTodos);
      } else {
        const start = getStartOfDay(selectedDate);
        const end = getEndOfDay(selectedDate);
        const dayTodos = await getTodosByDateRange(start.toISOString(), end.toISOString());
        setTodos(dayTodos);
      }
    } catch (err) {
      const message = err instanceof DatabaseError ? err.message : 'Failed to load calendar data';
      setError(message);
      console.error('Error loading calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [view, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        else d.setMonth(d.getMonth() + offset);
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

  // Show loading state
  if (isLoading && !refreshing && todos.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, marginTop: 16 }}>
          Loading calendar...
        </Text>
      </View>
    );
  }

  // Show error state
  if (error && !refreshing && todos.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
        <Text style={{ fontFamily: fonts.bold, color: c.error, fontSize: 18, marginBottom: 8 }}>
          Error Loading Calendar
        </Text>
        <Text
          style={{
            fontFamily: fonts.regular,
            color: c.onSurfaceVariant,
            textAlign: 'center',
            marginBottom: 24,
          }}>
          {error}
        </Text>
        <Pressable
          onPress={loadData}
          style={{
            backgroundColor: c.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 20,
          }}>
          <Text style={{ fontFamily: fonts.medium, color: c.onPrimary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View className="px-4 pt-12">
        {/* Header */}
        <View className="mb-2 items-center">
          <Text
            style={{ fontFamily: fonts.medium, color: c.primary }}
            className="mb-2 text-xs uppercase tracking-[3px]">
            {headerLabel}
          </Text>

          <View
            style={{ backgroundColor: c.surfaceContainer }}
            className="mb-2 flex-row items-center rounded-lg p-1">
            <Pressable onPress={() => navigate('prev')} className="px-3 py-2">
              <Text style={{ color: c.onSurfaceVariant }} className="text-lg font-semibold">
                ‹
              </Text>
            </Pressable>

            <View className="flex-1 flex-row justify-center gap-1">
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setView(v)}
                  style={view === v ? { backgroundColor: c.primary } : undefined}
                  className="rounded-md px-4 py-1.5">
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      color: view === v ? c.onPrimary : c.onSurfaceVariant,
                    }}
                    className="text-xs uppercase tracking-[2px]">
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => navigate('next')} className="px-3 py-2">
              <Text style={{ color: c.onSurfaceVariant }} className="text-lg font-semibold">
                ›
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => setSelectedDate(new Date())}
            style={{ backgroundColor: c.surfaceContainer }}
            className="rounded-md px-3 py-1.5">
            <Text
              style={{ fontFamily: fonts.bold, color: c.primary }}
              className="text-xs uppercase tracking-[2px]">
              Today
            </Text>
          </Pressable>
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
                        onPress={() => onTodoPress(t.id)}
                        style={{
                          backgroundColor: isCompleted
                            ? c.surfaceContainerHigh
                            : c.primaryContainer,
                          opacity: isCompleted ? 0.6 : 1,
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
                    onPress={() => onTodoPress(t.id)}
                    style={{ backgroundColor: isCompleted ? c.errorContainer : c.primaryContainer }}
                    className="mb-1 rounded-md px-3 py-2">
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: isCompleted ? c.onErrorContainer : c.onSurface,
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
    <Pressable
      onPress={() => onPress(todo.id)}
      style={{ backgroundColor: c.surfaceContainer, opacity: isCompleted ? 0.5 : 1 }}
      className="mb-2 flex-row items-center rounded-lg p-3">
      <Pressable onPress={() => toggleComplete(todo.id)} hitSlop={8} className="mr-3">
        <View
          style={{
            borderColor: isCompleted ? c.primary : c.onSurfaceVariant,
            backgroundColor: isCompleted ? c.primary : 'transparent',
          }}
          className="h-5 w-5 items-center justify-center rounded-full border-2">
          {isCompleted && (
            <Text style={{ color: c.onPrimary }} className="text-[10px]">
              ✓
            </Text>
          )}
        </View>
      </Pressable>
      <View className="flex-1">
        <Text
          style={{
            fontFamily: fonts.medium,
            color: isCompleted ? c.onSurfaceVariant : c.onSurface,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
          }}
          className="text-sm">
          {todo.name}
        </Text>
      </View>
      <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }} className="text-xs">
        {formatTime(todo.datetime, timeFormat === '24h')}
      </Text>
    </Pressable>
  );
}
