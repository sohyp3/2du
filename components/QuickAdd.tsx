import { useState, useCallback, useMemo } from 'react';
import { TextInput, Pressable, View, Text, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { Priority } from '@/db/todos';

const PRIORITIES: { key: Priority; label: string; active: string; inactive: string }[] = [
  { key: 'urgent', label: 'Urgent', active: 'bg-red-100', inactive: 'bg-gray-100' },
  { key: 'moderate', label: 'Moderate', active: 'bg-primary-200', inactive: 'bg-gray-100' },
  { key: 'low', label: 'Can wait', active: 'bg-gray-200', inactive: 'bg-gray-100' },
];

const DAY_OPTIONS = [
  { offset: 0, label: 'Today' },
  { offset: 1, label: 'Tomorrow' },
  { offset: 2, label: '+2d' },
  { offset: 3, label: '+3d' },
];

function getDefaultTimeMinutes(): number {
  const d = new Date();
  let total = d.getHours() * 60 + d.getMinutes() + 60;
  total = Math.ceil(total / 30) * 30;
  return total % (24 * 60);
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 12 || 12;
  const m = mins % 60;
  const ampm = Math.floor(mins / 60) < 12 ? 'AM' : 'PM';
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function QuickAdd() {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<Priority>('moderate');
  const [dayOffset, setDayOffset] = useState(0);
  const [timeMinutes, setTimeMinutes] = useState(getDefaultTimeMinutes);
  const [remindMe, setRemindMe] = useState(true);

  const addTodo = useTodoStore((s) => s.addTodo);
  const router = useRouter();

  const datetime = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
    return d.toISOString();
  }, [dayOffset, timeMinutes]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addTodo({ name: trimmed, priority, datetime, remind_me: remindMe });
    setName('');
    Keyboard.dismiss();
  }, [name, priority, datetime, remindMe, addTodo]);

  const adjustTime = useCallback((delta: number) => {
    setTimeMinutes((prev) => {
      const next = prev + delta;
      if (next < 0) return 24 * 60 + next;
      return next % (24 * 60);
    });
  }, []);

  return (
    <View className="rounded-2xl bg-white p-3 shadow-md">
      {/* Name input row */}
      <View className="mb-2 flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-lg bg-primary-50 px-3 py-2 text-base text-gray-800"
          placeholder="What do you need to do?"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
        <Pressable onPress={handleSubmit} className="rounded-lg bg-primary-400 px-4 py-2">
          <Text className="font-semibold text-white">Add</Text>
        </Pressable>
      </View>

      {/* Priority row */}
      <View className="mb-2 flex-row gap-1.5">
        {PRIORITIES.map(({ key, label, active, inactive }) => (
          <Pressable
            key={key}
            onPress={() => setPriority(key)}
            className={`rounded-full px-3 py-1 ${priority === key ? active : inactive}`}>
            <Text
              className={`text-xs font-medium ${priority === key ? 'text-gray-800' : 'text-gray-400'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Day + Time + Remind row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-1">
          {DAY_OPTIONS.map(({ offset, label }) => (
            <Pressable
              key={offset}
              onPress={() => setDayOffset(offset)}
              className={`rounded-full px-2.5 py-1 ${dayOffset === offset ? 'bg-primary-200' : 'bg-gray-100'}`}>
              <Text
                className={`text-xs font-medium ${dayOffset === offset ? 'text-primary-800' : 'text-gray-400'}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => adjustTime(-30)} className="px-1.5">
            <Text className="text-sm text-gray-400">‹</Text>
          </Pressable>
          <Text className="text-xs font-medium text-gray-600">{formatMinutes(timeMinutes)}</Text>
          <Pressable onPress={() => adjustTime(30)} className="px-1.5">
            <Text className="text-sm text-gray-400">›</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setRemindMe((v) => !v)} className="flex-row items-center gap-1">
          <View
            className={`h-4 w-4 items-center justify-center rounded ${remindMe ? 'bg-primary-400' : 'border border-gray-300'}`}>
            {remindMe && <Text className="text-[10px] text-white">✓</Text>}
          </View>
          <Text className="text-xs text-gray-500">Remind</Text>
        </Pressable>
      </View>

      {/* Details link */}
      <Pressable onPress={() => router.push('/add-todo')} className="mt-2 items-center">
        <Text className="text-xs text-primary-600">+ Add with details</Text>
      </Pressable>
    </View>
  );
}
