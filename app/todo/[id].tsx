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
import { getTodoById, Priority, Todo } from '@/db/todos';
import { formatTime } from '@/utils/dates';
import { DatePicker } from '@/components/DatePicker';

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  moderate: 'Moderate',
  low: 'Can wait',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  moderate: 'bg-primary-100 text-primary-700',
  low: 'bg-gray-100 text-gray-600',
};

const PRIORITIES: { key: Priority; label: string; active: string }[] = [
  { key: 'urgent', label: 'Urgent', active: 'bg-red-100' },
  { key: 'moderate', label: 'Moderate', active: 'bg-primary-200' },
  { key: 'low', label: 'Can wait', active: 'bg-gray-200' },
];

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const deleteTodoAction = useTodoStore((s) => s.deleteTodo);

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
      <View className="flex-1 items-center justify-center bg-primary-50">
        <Stack.Screen options={{ title: 'Todo' }} />
        <Text className="text-gray-400">Todo not found</Text>
      </View>
    );
  }

  const isCompleted = todo.status === 'completed';
  const dateStr = new Date(todo.datetime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: editing ? 'Edit Todo' : 'Todo',
          headerStyle: { backgroundColor: '#fefce8' },
          headerTintColor: '#713f12',
        }}
      />

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {editing ? (
          <>
            <Text className="mb-1 text-sm font-medium text-gray-600">Name</Text>
            <TextInput
              className="mb-4 rounded-xl bg-white px-4 py-3 text-base text-gray-800"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text className="mb-1 text-sm font-medium text-gray-600">Description</Text>
            <TextInput
              className="mb-4 min-h-[100px] rounded-xl bg-white px-4 py-3 text-base text-gray-800"
              placeholder="Add details..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />

            <Text className="mb-1 text-sm font-medium text-gray-600">Priority</Text>
            <View className="mb-4 flex-row gap-2">
              {PRIORITIES.map(({ key, label, active }) => (
                <Pressable
                  key={key}
                  onPress={() => setPriority(key)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${priority === key ? active : 'bg-white'}`}>
                  <Text
                    className={`text-sm font-medium ${priority === key ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Date */}
            <Text className="mb-1 text-sm font-medium text-gray-600">Date</Text>
            <View className="mb-4">
              <DatePicker value={selectedDate} onChange={setSelectedDate} />
            </View>

            {/* Time */}
            <Text className="mb-1 text-sm font-medium text-gray-600">Time</Text>
            <View className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-white py-3">
              <Pressable onPress={() => setHour((h) => (h - 1 + 24) % 24)} className="px-3">
                <Text className="text-xl text-gray-400">‹</Text>
              </Pressable>
              <Text className="w-8 text-center text-lg font-semibold text-gray-800">
                {(hour % 12 || 12).toString()}
              </Text>
              <Pressable onPress={() => setHour((h) => (h + 1) % 24)} className="px-3">
                <Text className="text-xl text-gray-400">›</Text>
              </Pressable>

              <Text className="text-lg font-semibold text-gray-800">:</Text>

              <Pressable onPress={() => setMinute((m) => (m - 5 + 60) % 60)} className="px-3">
                <Text className="text-xl text-gray-400">‹</Text>
              </Pressable>
              <Text className="w-8 text-center text-lg font-semibold text-gray-800">
                {minute.toString().padStart(2, '0')}
              </Text>
              <Pressable onPress={() => setMinute((m) => (m + 5) % 60)} className="px-3">
                <Text className="text-xl text-gray-400">›</Text>
              </Pressable>

              <Pressable
                onPress={() => setHour((h) => (h < 12 ? h + 12 : h - 12))}
                className="ml-1 rounded-lg bg-primary-100 px-3 py-1">
                <Text className="text-sm font-semibold text-primary-700">
                  {hour < 12 ? 'AM' : 'PM'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setRemindMe((v) => !v)}
              className="mb-6 flex-row items-center gap-3 rounded-xl bg-white px-4 py-3">
              <View
                className={`h-5 w-5 items-center justify-center rounded ${remindMe ? 'bg-primary-400' : 'border-2 border-gray-300'}`}>
                {remindMe && <Text className="text-xs text-white">✓</Text>}
              </View>
              <Text className="text-base text-gray-800">Remind me</Text>
            </Pressable>

            <View className="mb-8 flex-row gap-3">
              <Pressable
                onPress={() => setEditing(false)}
                className="flex-1 items-center rounded-xl bg-gray-200 py-3">
                <Text className="font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="flex-1 items-center rounded-xl bg-primary-400 py-3">
                <Text className="font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* View mode */}
            <View className="mb-4 rounded-xl bg-white p-4">
              <Text
                className={`text-xl font-bold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {todo.name}
              </Text>

              {todo.description ? (
                <Text className="mt-2 text-base leading-6 text-gray-600">{todo.description}</Text>
              ) : null}

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className={`rounded-full px-3 py-1 ${PRIORITY_COLORS[todo.priority]}`}>
                  <Text className="text-xs font-medium">{PRIORITY_LABELS[todo.priority]}</Text>
                </View>
                <View className="rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-xs font-medium text-gray-600">{dateStr}</Text>
                </View>
                <View className="rounded-full bg-gray-100 px-3 py-1">
                  <Text className="text-xs font-medium text-gray-600">
                    {formatTime(todo.datetime)}
                  </Text>
                </View>
                {todo.time_needed ? (
                  <View className="rounded-full bg-gray-100 px-3 py-1">
                    <Text className="text-xs font-medium text-gray-600">{todo.time_needed}m</Text>
                  </View>
                ) : null}
                {todo.remind_me ? (
                  <View className="rounded-full bg-primary-100 px-3 py-1">
                    <Text className="text-xs font-medium text-primary-700">Reminder on</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-3 self-start rounded-full bg-gray-50 px-3 py-1">
                <Text className="text-xs text-gray-400">
                  {isCompleted
                    ? 'Completed'
                    : todo.status === 'in_progress'
                      ? 'In progress'
                      : 'Pending'}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setEditing(true)}
                className="flex-1 items-center rounded-xl bg-primary-400 py-3.5">
                <Text className="font-semibold text-white">Edit</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                className="flex-1 items-center rounded-xl bg-red-100 py-3.5">
                <Text className="font-semibold text-red-600">Delete</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
