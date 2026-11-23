import { memo } from 'react';
import { View } from 'react-native';
import type { Todo } from '@/db/todos';
import { useCalendarsStore } from '@/store/calendarsStore';
import { space } from '@/utils/theme';
import { ColorChip } from './Chip';
import { TodoItem } from './TodoItem';

export interface CalendarCardProps {
  calendar: { id: string; name: string; color: string };
  todos: Todo[];
}

/** One calendar's tasks for the current period: a colour chip header, then its rows. Tapping
 * the chip shows only that calendar. */
export const CalendarCard = memo(function CalendarCard({ calendar, todos }: CalendarCardProps) {
  const select = useCalendarsStore((s) => s.select);
  const completed = todos.filter((t) => t.status === 'completed').length;
  return (
    <View>
      <View
        accessibilityRole="header"
        style={{ flexDirection: 'row', marginBottom: space.sm, marginTop: space.xs }}>
        <ColorChip
          label={`${calendar.name} · ${completed}/${todos.length}`}
          color={calendar.color}
          selected={false}
          onPress={() => select(calendar.id)}
        />
      </View>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </View>
  );
});
