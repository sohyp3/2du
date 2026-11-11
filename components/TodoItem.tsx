import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Todo } from '@/db/todos';
import { formatTodoMeta } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useGoalStore } from '@/store/goalStore';
import { space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { playTing } from '@/utils/ting';
export const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
  // Narrow selector: a row re-renders only when its own goal's name changes.
  const goalName = useGoalStore((s) => s.goals.find((g) => g.id === todo.goal_id)?.name);
  const toggle = useTodoStore((s) => s.toggleComplete),
    period = useTodoStore((s) => s.period);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const calendar = useCalendarsStore((s) =>
    s.calendars.find((c) => c.id === (todo.calendar_id || 'daily'))
  );
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const done = todo.status === 'completed';
  const inProgress = todo.status === 'in_progress';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56 }}>
      <PressFeedback
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: done }}
        onPress={() => {
          if (!done) void playTing();
          void toggle(todo.id);
        }}
        style={{
          width: 48,
          height: 48,
          marginLeft: -space.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons
          name={done ? 'checkmark-circle' : inProgress ? 'radio-button-on' : 'ellipse-outline'}
          size={22}
          color={done || inProgress ? c.primary : c.outline}
        />
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Edit ${todo.name}`}
        onPress={() => router.push(`/todo/${todo.id}`)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 56,
          justifyContent: 'center',
          paddingVertical: space.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.outlineVariant,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.medium,
              ...type.body,
              color: done ? c.onSurfaceVariant : c.onSurface,
              textDecorationLine: done ? 'line-through' : 'none',
            }}>
            {todo.name}
          </Text>
          {todo.priority === 'urgent' && !done && (
            <Ionicons name="flag" size={12} color={c.error} accessibilityLabel="Urgent" />
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 3 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: calendar?.color || c.primary,
            }}
          />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              ...type.caption,
            }}>
            {formatTodoMeta(todo.datetime, period, timeFormat === '24h')}
            {todo.time_needed ? ` · ${todo.time_needed} min` : ''}
            {goalName ? ` · ${goalName}` : ''}
            {todo.description ? ` · ${todo.description.split('\n')[0]}` : ''}
          </Text>
        </View>
      </PressFeedback>
    </View>
  );
});
