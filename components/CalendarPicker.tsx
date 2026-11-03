import { ScrollView, Text, View } from 'react-native';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
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
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0, maxHeight: 48 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 4, alignItems: 'center' }}>
      {(all
        ? [{ id: '', name: 'All calendars', color: c.onSurfaceVariant }, ...calendars]
        : calendars
      ).map((item) => {
        const chosen = item.id === (active || '');
        return (
          <PressFeedback
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            onPress={() => (onChange || select)(item.id || null)}
            style={{
              minHeight: 34,
              paddingHorizontal: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: chosen ? c.surfaceContainerHigh : 'transparent',
              borderWidth: 1,
              borderColor: chosen ? c.outline : c.outlineVariant,
            }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }} />
            <Text
              style={{
                fontFamily: fonts.medium,
                color: chosen ? c.onSurface : c.onSurfaceVariant,
                fontSize: 12,
              }}>
              {item.name}
            </Text>
          </PressFeedback>
        );
      })}
    </ScrollView>
  );
}
