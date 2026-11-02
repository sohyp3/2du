import { memo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Todo } from '@/db/todos';
import { formatTodoMeta } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { playTing } from '@/utils/ting';
export const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
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
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: c.outlineVariant,
        paddingVertical: 6,
        gap: 6,
      }}>
      <PressFeedback
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: done }}
        onPress={() => {
          if (!done) void playTing();
          void toggle(todo.id);
        }}
        style={{ width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={done ? c.primary : c.outline}
        />
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Edit ${todo.name}`}
        onPress={() => router.push(`/todo/${todo.id}`)}
        style={{ flex: 1, minWidth: 0, minHeight: 40, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.medium,
              fontSize: 15,
              lineHeight: 20,
              color: done ? c.onSurfaceVariant : c.onSurface,
              textDecorationLine: done ? 'line-through' : 'none',
            }}>
            {todo.name}
          </Text>
          {todo.priority === 'urgent' && <Ionicons name="flag-outline" size={14} color={c.error} />}
        </View>
        {todo.description ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              fontSize: 12,
              lineHeight: 16,
              marginTop: 2,
            }}>
            {todo.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: calendar?.color || c.primary,
            }}
          />
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 11 }}>
            {calendar?.name || 'Daily tasks'} ·{' '}
            {formatTodoMeta(todo.datetime, period, timeFormat === '24h')}
            {todo.time_needed ? ` · ${todo.time_needed}m` : ''}
          </Text>
        </View>
      </PressFeedback>
    </View>
  );
});
