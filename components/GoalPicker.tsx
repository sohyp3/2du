import { ScrollView, Text } from 'react-native';
import { useGoalStore } from '@/store/goalStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

// A row of goal chips. Renders nothing when there are no goals, so users without goals
// never see the field.
export function GoalPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const goals = useGoalStore((s) => s.goals);
  const c = useColors(),
    fonts = useFontFamily();
  if (!goals.length) return null;

  // Active goals, plus the current one even when it is paused or done.
  const shown = goals.filter((g) => g.status === 'active' || g.id === value);
  const options = [{ id: null as string | null, name: 'No goal' }, ...shown];

  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0, maxHeight: 48 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 4, alignItems: 'center' }}>
      {options.map((item) => {
        const chosen = item.id === value;
        return (
          <PressFeedback
            key={item.id ?? 'none'}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen }}
            onPress={() => onChange(item.id)}
            style={{
              minHeight: 44,
              paddingHorizontal: 12,
              borderRadius: 10,
              justifyContent: 'center',
              backgroundColor: chosen ? c.surfaceContainerHigh : 'transparent',
              borderWidth: 1,
              borderColor: chosen ? c.outline : c.outlineVariant,
            }}>
            <Text
              numberOfLines={1}
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
