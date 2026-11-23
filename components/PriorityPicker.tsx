import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Priority } from '@/db/todos';
import type { ThemeColors } from '@/store/themeStore';
import { contrastText, mix } from '@/utils/palette';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'moderate', label: 'Normal' },
  { key: 'low', label: 'Can wait' },
];

const TONE: Record<Priority, keyof ThemeColors> = {
  urgent: 'error',
  moderate: 'warning',
  low: 'outline',
};

const ICON: Record<Priority, keyof typeof Ionicons.glyphMap> = {
  urgent: 'flag',
  moderate: 'remove',
  low: 'time-outline',
};

/** Three pills, each in its priority's colour: a soft fill until chosen, then solid. */
export function PriorityPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {PRIORITIES.map((p) => {
        const selected = value === p.key;
        const tone = c[TONE[p.key]];
        const bg = selected ? tone : mix(c.surface, tone, 0.18);
        const ink = selected ? contrastText(tone) : c.onSurface;
        return (
          <PressFeedback
            key={p.key}
            haptic="select"
            accessibilityRole="button"
            accessibilityLabel={`${p.label} priority`}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(p.key)}
            style={{
              flex: 1,
              minHeight: 44,
              paddingHorizontal: space.sm,
              borderRadius: radius.pill,
              backgroundColor: bg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
            <Ionicons name={ICON[p.key]} size={14} color={selected ? ink : tone} />
            <Text numberOfLines={1} style={{ color: ink, fontFamily: fonts.bold, ...type.label }}>
              {p.label}
            </Text>
          </PressFeedback>
        );
      })}
    </View>
  );
}
