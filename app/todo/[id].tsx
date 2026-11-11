import { PriorityPicker, PRIORITIES } from '@/components/PriorityPicker';
import { CalendarPicker } from '@/components/CalendarPicker';
import { GoalPicker } from '@/components/GoalPicker';
import { useGoalStore } from '@/store/goalStore';
import { useState, useCallback, useEffect } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { getTodoById, Priority, Todo } from '@/db/todos';
import { formatTime } from '@/utils/dates';
import { DatePicker } from '@/components/DatePicker';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import {
  Field,
  FormButton,
  FormFooter,
  FormInput,
  SwitchRow,
  TimeStepper,
} from '@/components/form';
import { PressFeedback } from '@/components/PressFeedback';
import { useFocusStore } from '@/store/focusStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemeColors } from '@/store/themeStore';
import { DatabaseError } from '@/db/database';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const updateTodoAction = useTodoStore((s) => s.updateTodo);
  const deleteTodoAction = useTodoStore((s) => s.deleteTodo);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const c = useColors();
  const fonts = useFontFamily();

  // Open instantly from the in-memory list when we have the task; only hit the
  // database for tasks that are not loaded (e.g. opened from the calendar).
  const [initial] = useState(() => useTodoStore.getState().todos.find((t) => t.id === id) ?? null);
  const initialDate = initial ? new Date(initial.datetime) : new Date();
  const [todo, setTodo] = useState<Todo | null>(initial);
  const [isLoading, setIsLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [calendarId, setCalendarId] = useState<string | null>(initial?.calendar_id || 'daily');
  const [goalId, setGoalId] = useState<string | null>(initial?.goal_id ?? null);
  const hasGoals = useGoalStore((s) => s.goals.length > 0);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'moderate');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hour, setHour] = useState(initial ? initialDate.getHours() : 12);
  const [minute, setMinute] = useState(initial ? initialDate.getMinutes() : 0);
  const [remindMe, setRemindMe] = useState(initial?.remind_me ?? true);
  const [timeNeeded, setTimeNeeded] = useState(initial?.time_needed?.toString() ?? '');
  const focusing = useFocusStore((s) => s.session?.todoId === id);

  useEffect(() => {
    async function loadTodo() {
      if (!id) {
        setError('No todo ID provided');
        setIsLoading(false);
        return;
      }
      if (initial?.id === id) return;

      setIsLoading(true);
      setError(null);

      try {
        const found = await getTodoById(id);
        if (found) {
          setTodo(found);
          setCalendarId(found.calendar_id || 'daily');
          setGoalId(found.goal_id ?? null);
          setName(found.name);
          setDescription(found.description ?? '');
          setPriority(found.priority);
          const dt = new Date(found.datetime);
          setSelectedDate(dt);
          setHour(dt.getHours());
          setMinute(dt.getMinutes());
          setRemindMe(found.remind_me);
          setTimeNeeded(found.time_needed?.toString() ?? '');
        } else {
          setError('Todo not found');
        }
      } catch (err) {
        const message = err instanceof DatabaseError ? err.message : 'Failed to load todo';
        setError(message);
        console.error('Error loading todo:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTodo();
  }, [id, initial]);

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) return;
    setIsLoading(true);
    try {
      const dt = new Date(selectedDate);
      dt.setHours(hour, minute, 0, 0);
      const datetime = dt.toISOString();
      await updateTodoAction(id, {
        calendar_id: calendarId || 'daily',
        name: name.trim(),
        description: description.trim() || null,
        priority,
        datetime,
        remind_me: remindMe,
        goal_id: goalId,
        time_needed: timeNeeded ? parseInt(timeNeeded, 10) : null,
      });
      if (useTodoStore.getState().error) throw new Error(useTodoStore.getState().error!);
      setTodo((prev) =>
        prev
          ? {
              ...prev,
              calendar_id: calendarId || 'daily',
              goal_id: goalId,
              name: name.trim(),
              description: description.trim() || null,
              priority,
              datetime,
              remind_me: remindMe,
              time_needed: timeNeeded ? parseInt(timeNeeded, 10) : null,
            }
          : prev
      );
      setEditing(false);
    } catch (err) {
      const message = err instanceof DatabaseError ? err.message : 'Failed to update todo';
      Alert.alert('Error', message);
      console.error('Error saving todo:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    calendarId,
    goalId,
    id,
    name,
    description,
    priority,
    selectedDate,
    hour,
    minute,
    remindMe,
    timeNeeded,
    updateTodoAction,
  ]);

  const handleDelete = useCallback(async () => {
    const doDelete = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        await deleteTodoAction(id);
        router.back();
      } catch (err) {
        const message = err instanceof DatabaseError ? err.message : 'Failed to delete todo';
        Alert.alert('Error', message);
        console.error('Error deleting todo:', err);
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      await doDelete();
      return;
    }

    Alert.alert('Delete Todo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  }, [id, deleteTodoAction, router]);

  // Loading state
  if (isLoading && !todo) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, marginTop: 16 }}>
          Loading todo...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !todo) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
        <Stack.Screen options={{ title: 'Error' }} />
        <Text style={{ fontFamily: fonts.bold, color: c.error, fontSize: 18, marginBottom: 8 }}>
          {error || 'Todo not found'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: c.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 20,
            marginTop: 16,
          }}>
          <Text style={{ fontFamily: fonts.medium, color: c.onPrimary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isCompleted = todo.status === 'completed';
  const dateStr = new Date(todo.datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const statusLabel = isCompleted
    ? 'Completed'
    : focusing
      ? 'Focusing now'
      : todo.status === 'in_progress'
        ? 'In progress'
        : 'Pending';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: editing ? 'Edit task' : '', headerBackTitle: 'Back' }} />

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 840,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: space.xl,
        }}>
        {editing ? (
          <>
            <FormInput
              style={{ fontSize: 18, minHeight: 56, marginBottom: space.lg }}
              value={name}
              onChangeText={setName}
              autoFocus
              editable={!isLoading}
              accessibilityLabel="Task name"
            />
            <Field label="Calendar">
              <CalendarPicker value={calendarId} onChange={setCalendarId} all={false} />
            </Field>
            {hasGoals && (
              <Field label="Goal">
                <GoalPicker value={goalId} onChange={setGoalId} />
              </Field>
            )}
            <Field label="Notes">
              <FormInput
                placeholder="Add details"
                value={description}
                onChangeText={setDescription}
                multiline
                editable={!isLoading}
              />
            </Field>
            <Text
              style={{
                fontFamily: fonts.medium,
                color: c.onSurfaceVariant,
                ...type.label,
                marginBottom: space.sm,
              }}>
              Priority
            </Text>
            <PriorityPicker value={priority} onChange={setPriority} disabled={isLoading} />
            <Field label="Date">
              <DatePicker value={selectedDate} onChange={setSelectedDate} />
            </Field>
            <Field label="Time">
              <TimeStepper
                hour={hour}
                minute={minute}
                disabled={isLoading}
                onChange={(h, m) => {
                  setHour(h);
                  setMinute(m);
                }}
              />
            </Field>
            <Field label="Time needed (minutes)">
              <FormInput
                placeholder="e.g. 30"
                value={timeNeeded}
                onChangeText={(v) => setTimeNeeded(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </Field>
            <SwitchRow
              label="Remind me"
              value={remindMe}
              onValueChange={setRemindMe}
              disabled={isLoading}
            />
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: DISPLAY_FONT,
                ...type.display,
                color: isCompleted ? c.onSurfaceVariant : c.onSurface,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                writingDirection: 'auto',
              }}>
              {todo.name}
            </Text>
            <Text
              style={{
                fontFamily: fonts.medium,
                color: focusing ? c.primary : c.onSurfaceVariant,
                ...type.label,
                marginTop: space.xs,
              }}>
              {statusLabel}
            </Text>

            {todo.description ? (
              <Text
                style={{
                  fontFamily: fonts.regular,
                  color: c.onSurface,
                  ...type.body,
                  lineHeight: 23,
                  marginTop: space.lg,
                  writingDirection: 'auto',
                }}>
                {todo.description}
              </Text>
            ) : null}

            <View
              style={{
                backgroundColor: c.surfaceContainer,
                borderRadius: radius.lg,
                overflow: 'hidden',
                marginTop: space.xl,
              }}>
              <DetailRow label="Date" value={dateStr} c={c} fonts={fonts} />
              <DetailRow
                label="Time"
                value={formatTime(todo.datetime, timeFormat === '24h')}
                c={c}
                fonts={fonts}
              />
              <DetailRow
                label="Priority"
                value={PRIORITIES.find((p) => p.key === todo.priority)?.label ?? todo.priority}
                c={c}
                fonts={fonts}
              />
              {todo.time_needed ? (
                <DetailRow label="Duration" value={`${todo.time_needed} min`} c={c} fonts={fonts} />
              ) : null}
              <DetailRow
                label="Reminder"
                value={todo.remind_me ? 'On' : 'Off'}
                c={c}
                fonts={fonts}
                last
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xl }}>
              <PressFeedback
                accessibilityRole="button"
                onPress={handleDelete}
                disabled={isLoading}
                style={{
                  minHeight: 44,
                  paddingHorizontal: space.lg,
                  flexDirection: 'row',
                  gap: space.sm,
                  alignItems: 'center',
                }}>
                <Ionicons name="trash-outline" size={16} color={c.error} />
                <Text style={{ fontFamily: fonts.medium, color: c.error, ...type.label }}>
                  Delete task
                </Text>
              </PressFeedback>
            </View>
          </>
        )}
      </ScrollView>
      <FormFooter>
        {editing ? (
          <>
            <FormButton
              label="Cancel"
              kind="tonal"
              onPress={() => setEditing(false)}
              disabled={isLoading}
            />
            <FormButton
              label="Save"
              onPress={handleSave}
              busy={isLoading}
              disabled={!name.trim()}
            />
          </>
        ) : (
          <>
            <FormButton
              label="Edit"
              kind="tonal"
              icon="create-outline"
              onPress={() => setEditing(true)}
              disabled={isLoading}
            />
            {!isCompleted && (
              <FormButton
                label={focusing ? 'Back to timer' : 'Start focus'}
                icon={focusing ? 'timer-outline' : 'play'}
                onPress={() =>
                  focusing
                    ? router.push('/focus')
                    : router.push({ pathname: '/focus', params: { id: todo.id } })
                }
              />
            )}
          </>
        )}
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

function DetailRow({
  label,
  value,
  c,
  fonts,
  last,
}: {
  label: string;
  value: string;
  c: ThemeColors;
  fonts: { regular: string; medium: string };
  last?: boolean;
}) {
  return (
    <View
      style={[
        { minHeight: 48 },
        last
          ? undefined
          : {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.surfaceContainerHighest,
            },
      ]}
      className="flex-row items-center justify-between px-4 py-3">
      <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }} className="text-sm">
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-sm">
        {value}
      </Text>
    </View>
  );
}
