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
        paddingVertical: 14,
        gap: 12,
      }}>
      <PressFeedback
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: done }}
        onPress={() => toggle(todo.id)}
        style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={done ? c.primary : c.outline}
        />
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Edit ${todo.name}`}
        onPress={() => router.push(`/todo/${todo.id}`)}
        style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.medium,
              fontSize: 16,
              lineHeight: 24,
              color: done ? c.onSurfaceVariant : c.onSurface,
              textDecorationLine: done ? 'line-through' : 'none',
            }}>
            {todo.name}
          </Text>
          {todo.priority === 'urgent' && <Ionicons name="flag-outline" size={15} color={c.error} />}
        </View>
        {todo.description ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              fontSize: 13,
              marginTop: 4,
            }}>
            {todo.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: calendar?.color || c.primary,
            }}
          />
          <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 }}>
            {calendar?.name || 'Daily tasks'} ·{' '}
            {formatTodoMeta(todo.datetime, period, timeFormat === '24h')}
            {todo.time_needed ? ` · ${todo.time_needed}m` : ''}
          </Text>
        </View>
      </PressFeedback>
    </View>
  );
});
