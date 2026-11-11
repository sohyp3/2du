import { ScrollView, View } from 'react-native';
import { useCalendarsStore } from '@/store/calendarsStore';
import { space, useColors } from '@/utils/theme';
import { Chip } from './Chip';
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
  const c = useColors();
  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: space.xs, paddingVertical: space.xs, alignItems: 'center' }}>
      {(all ? [{ id: '', name: 'All', color: c.onSurfaceVariant }, ...calendars] : calendars).map(
        (item) => (
          <Chip
            key={item.id}
            label={item.name}
            accessibilityLabel={item.id ? item.name : 'All calendars'}
            selected={item.id === (active || '')}
            onPress={() => (onChange || select)(item.id || null)}
            leading={
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
            }
          />
        )
      )}
    </ScrollView>
  );
}
