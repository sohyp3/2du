import { useState, useCallback, useEffect } from 'react';
import {
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { getTodoById, Priority, Todo } from '@/db/todos';
import { formatTime } from '@/utils/dates';
import { DatePicker } from '@/components/DatePicker';
import { useColors, useFontFamily } from '@/utils/theme';
import { ThemeColors } from '@/store/themeStore';

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'low', label: 'Can wait' },
];

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const deleteTodoAction = useTodoStore((s) => s.deleteTodo);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const c = useColors();
  const fonts = useFontFamily();

  const [todo, setTodo] = useState<Todo | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('moderate');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [remindMe, setRemindMe] = useState(true);

  useEffect(() => {
    if (!id) return;
    const found = getTodoById(id);
    if (found) {
      setTodo(found);
      setName(found.name);
      setDescription(found.description ?? '');
      setPriority(found.priority);
      const dt = new Date(found.datetime);
      setSelectedDate(dt);
      setHour(dt.getHours());
      setMinute(dt.getMinutes());
      setRemindMe(found.remind_me);
    }
  }, [id]);

  const handleSave = useCallback(() => {
    if (!id || !name.trim()) return;
    const dt = new Date(selectedDate);
    dt.setHours(hour, minute, 0, 0);
    const datetime = dt.toISOString();
    updateTodo(id, {
      name: name.trim(),
      description: description.trim() || null,
      priority,
      datetime,
      remind_me: remindMe,
    });
    setTodo((prev) =>
      prev
        ? {
            ...prev,
            name: name.trim(),
            description: description.trim() || null,
            priority,
            datetime,
            remind_me: remindMe,
          }
        : prev
    );
    setEditing(false);
  }, [id, name, description, priority, selectedDate, hour, minute, remindMe, updateTodo]);

  const handleDelete = useCallback(() => {
    const doDelete = () => {
      if (!id) return;
      deleteTodoAction(id);
      router.back();
    };
    if (Platform.OS === 'web') {
      doDelete();
      return;
    }
    Alert.alert('Delete Todo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  }, [id, deleteTodoAction, router]);

  if (!todo) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Stack.Screen options={{ title: 'Todo' }} />
        <Text style={{ fontFamily: fonts.regular, color: c.outline }}>Todo not found</Text>
      </View>
    );
  }

  const isCompleted = todo.status === 'completed';
  const dateStr = new Date(todo.datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'Edit' : '', headerBackTitle: 'Back' }} />

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {editing ? (
          <>
            <Text
              style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
              className="mb-1 text-sm">
              Name
            </Text>
            <TextInput
              style={{
                fontFamily: fonts.regular,
                backgroundColor: c.surfaceContainerLow,
                color: c.onSurface,
              }}
              className="mb-4 rounded-lg px-4 py-3 text-base"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text
              style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
              className="mb-1 text-sm">
              Description
            </Text>
            <TextInput
              style={{
                fontFamily: fonts.regular,
                backgroundColor: c.surfaceContainerLow,
                color: c.onSurface,
              }}
              placeholderTextColor={c.outline}
              className="mb-4 min-h-[100px] rounded-lg px-4 py-3 text-base"
              placeholder="Add details..."
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <Text
              style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
              className="mb-1 text-sm">
              Priority
            </Text>
            <View className="mb-4 flex-row gap-2">
              {PRIORITIES.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => setPriority(key)}
                  style={{
                    backgroundColor:
                      priority === key ? c.surfaceContainerHighest : c.surfaceContainerLow,
                  }}
                  className="flex-1 items-center rounded-lg py-2.5">
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      color: priority === key ? c.onSurface : c.outline,
                    }}
                    className="text-sm">
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
              className="mb-1 text-sm">
              Date
            </Text>
            <View className="mb-4">
              <DatePicker value={selectedDate} onChange={setSelectedDate} />
            </View>

            <Text
              style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
              className="mb-1 text-sm">
              Time
            </Text>
            <View
              style={{ backgroundColor: c.surfaceContainerLow }}
              className="mb-4 flex-row items-center justify-center gap-2 rounded-lg py-3">
              <Pressable onPress={() => setHour((h) => (h - 1 + 24) % 24)} className="px-3">
                <Text style={{ color: c.outline }} className="text-xl">
                  ‹
                </Text>
              </Pressable>
              <Text
                style={{ fontFamily: fonts.medium, color: c.onSurface }}
                className="w-8 text-center text-lg">
                {(hour % 12 || 12).toString()}
              </Text>
              <Pressable onPress={() => setHour((h) => (h + 1) % 24)} className="px-3">
                <Text style={{ color: c.outline }} className="text-xl">
                  ›
                </Text>
              </Pressable>

              <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-lg">
                :
              </Text>

              <Pressable onPress={() => setMinute((m) => (m - 5 + 60) % 60)} className="px-3">
                <Text style={{ color: c.outline }} className="text-xl">
                  ‹
                </Text>
              </Pressable>
              <Text
                style={{ fontFamily: fonts.medium, color: c.onSurface }}
                className="w-8 text-center text-lg">
                {minute.toString().padStart(2, '0')}
              </Text>
              <Pressable onPress={() => setMinute((m) => (m + 5) % 60)} className="px-3">
                <Text style={{ color: c.outline }} className="text-xl">
                  ›
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHour((h) => (h < 12 ? h + 12 : h - 12))}
                style={{ backgroundColor: c.surfaceContainerHighest }}
                className="ml-1 rounded-lg px-3 py-1">
                <Text style={{ fontFamily: fonts.medium, color: c.primary }} className="text-sm">
                  {hour < 12 ? 'AM' : 'PM'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setRemindMe((v) => !v)}
              style={{ backgroundColor: c.surfaceContainerLow }}
              className="mb-6 flex-row items-center gap-3 rounded-lg px-4 py-3">
              <View
                style={{
                  backgroundColor: remindMe ? c.primary : 'transparent',
                  borderColor: remindMe ? c.primary : c.outline,
                  borderWidth: remindMe ? 0 : 2,
                }}
                className="h-5 w-5 items-center justify-center rounded">
                {remindMe && (
                  <Text style={{ color: c.onPrimary }} className="text-xs">
                    ✓
                  </Text>
                )}
              </View>
              <Text style={{ fontFamily: fonts.regular, color: c.onSurface }} className="text-base">
                Remind me
              </Text>
            </Pressable>

            <View className="mb-8 flex-row gap-3">
              <Pressable
                onPress={() => setEditing(false)}
                style={{ backgroundColor: c.surfaceContainerHighest }}
                className="flex-1 items-center rounded-full py-3">
                <Text style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={{ backgroundColor: c.primary }}
                className="flex-1 items-center rounded-full py-3">
                <Text style={{ fontFamily: fonts.medium, color: c.onPrimary }}>Save</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: fonts.bold,
                color: isCompleted ? c.outline : c.onSurface,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              }}
              className="text-2xl">
              {todo.name}
            </Text>

            <Text
              style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}
              className="mt-1 text-sm">
              {isCompleted
                ? 'Completed'
                : todo.status === 'in_progress'
                  ? 'In progress'
                  : 'Pending'}
            </Text>

            {todo.description ? (
              <Text
                style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}
                className="mt-4 text-base leading-6">
                {todo.description}
              </Text>
            ) : null}

            <View
              style={{ backgroundColor: c.surfaceContainer }}
              className="mt-6 overflow-hidden rounded-xl">
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

            <View className="mb-8 mt-6 flex-row gap-3">
              <Pressable
                onPress={() => setEditing(true)}
                style={{ backgroundColor: c.primary }}
                className="flex-1 items-center rounded-full py-3.5">
                <Text style={{ fontFamily: fonts.medium, color: c.onPrimary }}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                style={{ backgroundColor: c.errorContainer }}
                className="flex-1 items-center rounded-full py-3.5">
                <Text style={{ fontFamily: fonts.medium, color: c.error }}>Delete</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
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
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: c.outlineVariant }}
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
