import { useState, useMemo, useCallback } from 'react';
import {
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { Priority } from '@/db/todos';
import { DatePicker } from '@/components/DatePicker';

const PRIORITIES: { key: Priority; label: string; active: string }[] = [
  { key: 'urgent', label: 'Urgent', active: 'bg-red-100' },
  { key: 'moderate', label: 'Moderate', active: 'bg-primary-200' },
  { key: 'low', label: 'Can wait', active: 'bg-gray-200' },
];

function getDefaultHour(): number {
  return (new Date().getHours() + 1) % 24;
}

export default function AddTodoScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('moderate');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hour, setHour] = useState(getDefaultHour);
  const [minute, setMinute] = useState(0);
  const [timeNeeded, setTimeNeeded] = useState('');
  const [remindMe, setRemindMe] = useState(true);

  const addTodo = useTodoStore((s) => s.addTodo);
  const router = useRouter();

  const datetime = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }, [selectedDate, hour, minute]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addTodo({
      name: trimmed,
      description: description.trim() || null,
      priority,
      datetime,
      time_needed: timeNeeded ? parseInt(timeNeeded, 10) : null,
      remind_me: remindMe,
    });
    router.back();
  }, [name, description, priority, datetime, timeNeeded, remindMe, addTodo, router]);

  const formatHour = (h: number) => {
    const display = h % 12 || 12;
    return display.toString();
  };

  const ampm = hour < 12 ? 'AM' : 'PM';

  const toggleAmPm = useCallback(() => {
    setHour((h) => (h < 12 ? h + 12 : h - 12));
  }, []);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: 'New Todo',
          headerStyle: { backgroundColor: '#fefce8' },
          headerTintColor: '#713f12',
        }}
      />

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        {/* Name */}
        <Text className="mb-1 text-sm font-medium text-gray-600">Name</Text>
        <TextInput
          className="mb-4 rounded-xl bg-white px-4 py-3 text-base text-gray-800"
          placeholder="What do you need to do?"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Description */}
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

        {/* Priority */}
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

        {/* Date picker */}
        <Text className="mb-1 text-sm font-medium text-gray-600">Date</Text>
        <View className="mb-4">
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </View>

        {/* Time - hour and minute selectors */}
        <Text className="mb-1 text-sm font-medium text-gray-600">Time</Text>
        <View className="mb-4 flex-row items-center justify-center gap-2 rounded-xl bg-white py-3">
          {/* Hour */}
          <Pressable onPress={() => setHour((h) => (h - 1 + 24) % 24)} className="px-3">
            <Text className="text-xl text-gray-400">‹</Text>
          </Pressable>
          <Text className="w-8 text-center text-lg font-semibold text-gray-800">
            {formatHour(hour)}
          </Text>
          <Pressable onPress={() => setHour((h) => (h + 1) % 24)} className="px-3">
            <Text className="text-xl text-gray-400">›</Text>
          </Pressable>

          <Text className="text-lg font-semibold text-gray-800">:</Text>

          {/* Minute */}
          <Pressable onPress={() => setMinute((m) => (m - 5 + 60) % 60)} className="px-3">
            <Text className="text-xl text-gray-400">‹</Text>
          </Pressable>
          <Text className="w-8 text-center text-lg font-semibold text-gray-800">
            {minute.toString().padStart(2, '0')}
          </Text>
          <Pressable onPress={() => setMinute((m) => (m + 5) % 60)} className="px-3">
            <Text className="text-xl text-gray-400">›</Text>
          </Pressable>

          {/* AM/PM */}
          <Pressable onPress={toggleAmPm} className="ml-1 rounded-lg bg-primary-100 px-3 py-1">
            <Text className="text-sm font-semibold text-primary-700">{ampm}</Text>
          </Pressable>
        </View>

        {/* Time needed */}
        <Text className="mb-1 text-sm font-medium text-gray-600">Time needed (minutes)</Text>
        <TextInput
          className="mb-4 rounded-xl bg-white px-4 py-3 text-base text-gray-800"
          placeholder="e.g. 30"
          placeholderTextColor="#9ca3af"
          value={timeNeeded}
          onChangeText={setTimeNeeded}
          keyboardType="number-pad"
        />

        {/* Remind me */}
        <Pressable
          onPress={() => setRemindMe((v) => !v)}
          className="mb-6 flex-row items-center gap-3 rounded-xl bg-white px-4 py-3">
          <View
            className={`h-5 w-5 items-center justify-center rounded ${remindMe ? 'bg-primary-400' : 'border-2 border-gray-300'}`}>
            {remindMe && <Text className="text-xs text-white">✓</Text>}
          </View>
          <Text className="text-base text-gray-800">Remind me</Text>
        </Pressable>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          className="mb-8 items-center rounded-xl bg-primary-400 py-3.5">
          <Text className="text-base font-semibold text-white">Save Todo</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
