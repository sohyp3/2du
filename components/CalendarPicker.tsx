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
  const { calendars, selected, select } = useCalendarsStore();
  const active = value === undefined ? selected : value;
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0, maxHeight: 64 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 8, alignItems: 'center' }}>
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
              minHeight: 44,
              paddingHorizontal: 14,
              borderRadius: 12,
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
                fontSize: 13,
              }}>
              {item.name}
            </Text>
          </PressFeedback>
        );
      })}
    </ScrollView>
  );
}
