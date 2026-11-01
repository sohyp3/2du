import { PriorityPicker } from '@/components/PriorityPicker';
import { CalendarPicker } from '@/components/CalendarPicker';
import { useCalendarsStore } from '@/store/calendarsStore';
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
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { Priority } from '@/db/todos';
import { DatePicker } from '@/components/DatePicker';
import { useColors, useFontFamily } from '@/utils/theme';

function getDefaultHour(): number {
  return (new Date().getHours() + 1) % 24;
}

export default function AddTodoScreen() {
  const params = useLocalSearchParams<{ name?: string }>();
  const [calendarId, setCalendarId] = useState<string | null>(
    useCalendarsStore.getState().selected || 'daily'
  );
  const [name, setName] = useState(params.name ?? '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('moderate');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hour, setHour] = useState(getDefaultHour);
  const [minute, setMinute] = useState(0);
  const [timeNeeded, setTimeNeeded] = useState('');
  const [remindMe, setRemindMe] = useState(true);
  const c = useColors();
  const fonts = useFontFamily();

  const addTodo = useTodoStore((s) => s.addTodo);
  const router = useRouter();

  const datetime = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }, [selectedDate, hour, minute]);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addTodo({
      calendar_id: calendarId || 'daily',
      name: trimmed,
      description: description.trim() || null,
      priority,
      datetime,
      time_needed: timeNeeded ? parseInt(timeNeeded, 10) : null,
      remind_me: remindMe,
    });
    if (!useTodoStore.getState().error) router.back();
  }, [calendarId, name, description, priority, datetime, timeNeeded, remindMe, addTodo, router]);

  const formatHour = (h: number) => (h % 12 || 12).toString();
  const ampm = hour < 12 ? 'AM' : 'PM';
  const toggleAmPm = useCallback(() => setHour((h) => (h < 12 ? h + 12 : h - 12)), []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'New task' }} />

      <ScrollView
        className="flex-1 px-4 pt-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: '100%',
          maxWidth: 760,
          alignSelf: 'center',
          paddingBottom: 40,
        }}>
        <CalendarPicker value={calendarId} onChange={setCalendarId} all={false} />
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
          placeholderTextColor={c.outline}
          className="mb-4 rounded-lg px-4 py-3 text-base"
          placeholder="What do you need to do?"
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
        <PriorityPicker value={priority} onChange={setPriority} />

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
            {formatHour(hour)}
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
            onPress={toggleAmPm}
            style={{ backgroundColor: c.surfaceContainerHighest }}
            className="ml-1 rounded-lg px-3 py-1">
            <Text style={{ fontFamily: fonts.medium, color: c.primary }} className="text-sm">
              {ampm}
            </Text>
          </Pressable>
        </View>

        <Text
          style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
          className="mb-1 text-sm">
          Time needed (minutes)
        </Text>
        <TextInput
          style={{
            fontFamily: fonts.regular,
            backgroundColor: c.surfaceContainerLow,
            color: c.onSurface,
          }}
          placeholderTextColor={c.outline}
          className="mb-4 rounded-lg px-4 py-3 text-base"
          placeholder="e.g. 30"
          value={timeNeeded}
          onChangeText={setTimeNeeded}
          keyboardType="number-pad"
        />

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

        <Pressable
          onPress={handleSave}
          style={{ backgroundColor: c.primary }}
          className="mb-8 items-center rounded-full py-3.5">
          <Text
            style={{ fontFamily: fonts.bold, color: c.onPrimary }}
            className="text-sm uppercase tracking-[3px]">
            Save Todo
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
