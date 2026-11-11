import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Priority } from '@/db/todos';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
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
  const c = useColors(),
    fonts = useFontFamily();
  // One quiet track; colour appears only where it means something (a chosen Urgent).
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: radius.md,
        backgroundColor: c.surfaceContainer,
        marginBottom: space.lg,
      }}>
      {PRIORITIES.map((p) => {
        const selected = value === p.key;
        const ink = selected ? (p.key === 'urgent' ? c.error : c.onSurface) : c.onSurfaceVariant;
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
              minHeight: 44,
              borderRadius: radius.sm + 1,
              backgroundColor: selected ? c.surfaceContainerHighest : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
            {p.key === 'urgent' && <Ionicons name="flag" size={12} color={ink} />}
            <Text style={{ color: ink, fontFamily: fonts.medium, ...type.label }}>{p.label}</Text>
          </PressFeedback>
        );
      })}
    </View>
  );
}
