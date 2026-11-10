import { memo } from 'react';
import { Text, View } from 'react-native';
import type { Todo } from '@/db/todos';
import { useColors, useFontFamily } from '@/utils/theme';
import { TodoItem } from './TodoItem';

export interface CalendarCardProps {
  calendar: { id: string; name: string; color: string };
  todos: Todo[];
}

/** One calendar's tasks for the current period, grouped in a card on the Tasks screen. */
export const CalendarCard = memo(function CalendarCard({ calendar, todos }: CalendarCardProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const completed = todos.filter((t) => t.status === 'completed').length;
  return (
    <View
      style={{
        backgroundColor: c.surfaceContainer,
        borderRadius: 16,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: calendar.color,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            minWidth: 0,
            color: c.onSurface,
            fontFamily: fonts.medium,
            fontSize: 13,
          }}>
          {calendar.name}
        </Text>
        <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular, fontSize: 12 }}>
          {completed} of {todos.length}
        </Text>
      </View>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </View>
  );
});
