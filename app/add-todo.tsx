import { PriorityPicker } from '@/components/PriorityPicker';
import { CalendarPicker } from '@/components/CalendarPicker';
import { GoalPicker } from '@/components/GoalPicker';
import { useGoalStore } from '@/store/goalStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useState, useMemo, useCallback } from 'react';
import { Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useTodoStore } from '@/store/todoStore';
import { Priority } from '@/db/todos';
import { DatePicker } from '@/components/DatePicker';
import { space, type, useColors, useFontFamily } from '@/utils/theme';
import {
  Field,
  FormButton,
  FormFooter,
  FormInput,
  SwitchRow,
  TimeStepper,
} from '@/components/form';

function getDefaultHour(): number {
  return (new Date().getHours() + 1) % 24;
}

export default function AddTodoScreen() {
  const params = useLocalSearchParams<{ name?: string; goal?: string }>();
  const [calendarId, setCalendarId] = useState<string | null>(
    useCalendarsStore.getState().selected || 'daily'
  );
  const [goalId, setGoalId] = useState<string | null>(params.goal ?? null);
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
  const hasGoals = useGoalStore((s) => s.goals.length > 0);
  const router = useRouter();
  const headerHeight = useHeaderHeight();

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
      goal_id: goalId,
    });
    if (!useTodoStore.getState().error) router.back();
  }, [
    calendarId,
    goalId,
    name,
    description,
    priority,
    datetime,
    timeNeeded,
    remindMe,
    addTodo,
    router,
  ]);

  const canSave = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surface }}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: 'New task' }} />

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Padding lives on the content, not the scroll view: on Android, padding on the view
        // itself clips scrolled content and leaves a dead band at the edges.
        contentContainerStyle={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 760,
          alignSelf: 'center',
          paddingHorizontal: space.lg,
          paddingTop: space.lg,
          paddingBottom: space.xl,
        }}>
        <FormInput
          style={{ fontSize: 18, minHeight: 56, marginBottom: space.lg }}
          placeholder="What do you need to do?"
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
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
        <PriorityPicker value={priority} onChange={setPriority} />
        <Field label="Date">
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </Field>
        <Field label="Time">
          <TimeStepper
            hour={hour}
            minute={minute}
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
          />
        </Field>
        <SwitchRow label="Remind me" value={remindMe} onValueChange={setRemindMe} />
      </ScrollView>
      <FormFooter>
        <FormButton label="Save task" onPress={handleSave} disabled={!canSave} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}
