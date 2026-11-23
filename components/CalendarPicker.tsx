import { ScrollView } from 'react-native';
import { useCalendarsStore } from '@/store/calendarsStore';
import { space } from '@/utils/theme';
import { Chip, ColorChip } from './Chip';

/** A row of calendar chips, each filled with its calendar's colour, plus an optional "All". */
export function CalendarPicker({
  value,
  onChange,
  all = true,
}: {
  value?: string | null;
  onChange?: (id: string | null) => void;
  all?: boolean;
}) {
  const calendars = useCalendarsStore((s) => s.calendars),
    selected = useCalendarsStore((s) => s.selected),
    select = useCalendarsStore((s) => s.select);
  const active = value === undefined ? selected : value;
  const pick = onChange || select;
  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: space.xs, paddingVertical: space.xs, alignItems: 'center' }}>
      {all && (
        <Chip
          label="All"
          accessibilityLabel="All calendars"
          selected={!active}
          onPress={() => pick(null)}
        />
      )}
      {calendars.map((item) => (
        <ColorChip
          key={item.id}
          label={item.name}
          color={item.color}
          selected={item.id === active}
          onPress={() => pick(item.id)}
        />
      ))}
    </ScrollView>
  );
}
