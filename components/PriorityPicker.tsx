import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Priority } from '@/db/todos';
import { useThemeStore } from '@/store/themeStore';
import { useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'moderate', label: 'Normal' },
  { key: 'low', label: 'Can wait' },
];
export function PriorityPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}) {
  const light = useThemeStore((s) => s.themeKey === 'silver');
  const fonts = useFontFamily();
  const tones = light
    ? {
        urgent: { ink: '#9c302b', bg: '#fbe8e5' },
        moderate: { ink: '#80550f', bg: '#fbf0d3' },
        low: { ink: '#426127', bg: '#e7efdc' },
      }
    : {
        urgent: { ink: '#f1aaa0', bg: '#432722' },
        moderate: { ink: '#e6c77e', bg: '#3b321e' },
        low: { ink: '#b9d68a', bg: '#2b3620' },
      };
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      {PRIORITIES.map((p) => {
        const tone = tones[p.key],
          selected = value === p.key;
        return (
          <PressFeedback
            key={p.key}
            accessibilityRole="button"
            accessibilityLabel={`${p.label} priority`}
            accessibilityState={{ selected }}
            disabled={disabled}
            onPress={() => onChange(p.key)}
            style={{
              flex: 1,
              minHeight: 52,
              paddingHorizontal: 8,
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: selected ? tone.ink : 'transparent',
              backgroundColor: tone.bg,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'flag-outline'}
              size={16}
              color={tone.ink}
            />
            <Text style={{ color: tone.ink, fontFamily: fonts.medium, fontSize: 13 }}>
              {p.label}
            </Text>
          </PressFeedback>
        );
      })}
    </View>
  );
}
