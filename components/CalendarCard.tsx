import { memo } from 'react';
import { Text, View } from 'react-native';
import type { Todo } from '@/db/todos';
import { useColors, useFontFamily } from '@/utils/theme';
import { TodoItem } from './TodoItem';

export interface CalendarCardProps {
  calendar: { id: string; name: string; color: string };
  todos: Todo[];
}

/** One calendar's tasks for the current period, grouped under its name on the Tasks screen. */
export const CalendarCard = memo(function CalendarCard({ calendar, todos }: CalendarCardProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const completed = todos.filter((t) => t.status === 'completed').length;
  return (
    // A labelled group rather than a card: the calendar's colour is its dot, as on every row.
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingVertical: 6,
        }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: calendar.color }} />
        <Text
          accessibilityRole="header"
          style={{
            flex: 1,
            minWidth: 0,
            color: c.onSurfaceVariant,
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
