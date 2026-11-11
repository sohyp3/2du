import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

/** A borderless filter chip: selected is a tonal fill, unselected is just text. */
export function Chip({
  label,
  selected,
  onPress,
  leading,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  accessibilityLabel?: string;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        minHeight: 36,
        paddingHorizontal: space.md,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: selected ? c.surfaceContainerHigh : 'transparent',
      }}>
      {leading}
      <Text
        style={{
          fontFamily: fonts.medium,
          color: selected ? c.onSurface : c.onSurfaceVariant,
          ...type.label,
        }}>
        {label}
      </Text>
    </PressFeedback>
  );
}

/** A segmented control on one tonal track. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  grow = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Stretch segments to fill the row. */
  grow?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignSelf: grow ? 'stretch' : 'flex-start',
        backgroundColor: c.surfaceContainer,
        padding: 3,
        borderRadius: radius.md,
      }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressFeedback
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: grow ? 1 : undefined,
              minHeight: 34,
              paddingHorizontal: space.lg,
              borderRadius: radius.sm + 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? c.surfaceContainerHighest : 'transparent',
            }}>
            <Text
              style={{
                fontFamily: fonts.medium,
                color: selected ? c.onSurface : c.onSurfaceVariant,
                ...type.label,
              }}>
              {o.label}
            </Text>
          </PressFeedback>
        );
      })}
    </View>
  );
}
