import type { ReactNode } from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { contrastText } from '@/utils/palette';
import { radius, space, type, useColors, useFontFamily, useIsDark } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

const CHIP: ViewStyle = {
  height: 36,
  paddingHorizontal: space.lg,
  borderRadius: radius.pill,
  flexDirection: 'row',
  alignItems: 'center',
  gap: space.sm,
};

/** A pill filter chip: selected is the accent fill, unselected a tonal fill. */
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
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{ ...CHIP, backgroundColor: selected ? c.primary : c.surfaceContainer }}>
      {leading}
      <Text
        style={{
          fontFamily: fonts.bold,
          color: selected ? c.onPrimary : c.onSurface,
          ...type.label,
        }}>
        {label}
      </Text>
    </PressFeedback>
  );
}

/** A pill chip filled with its own colour, for calendars and goal categories. */
export function ColorChip({
  label,
  color,
  selected,
  onPress,
  icon,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const ink = contrastText(color);
  return (
    <PressFeedback
      haptic="select"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        ...CHIP,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: selected ? c.onSurface : 'transparent',
      }}>
      {icon && <Ionicons name={icon} size={16} color={ink} />}
      <Text style={{ fontFamily: fonts.bold, color: ink, ...type.label }}>{label}</Text>
    </PressFeedback>
  );
}

/** A segmented control: a pill track with a raised thumb on the selected segment. */
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
  const dark = useIsDark();
  const thumb: ViewStyle = Platform.select<ViewStyle>({
    web: { boxShadow: `0 2px 8px ${c.shadow}` },
    android: { elevation: 2, shadowColor: c.shadow },
    default: {
      shadowColor: c.shadow,
      shadowOpacity: 1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
  });
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignSelf: grow ? 'stretch' : 'flex-start',
        backgroundColor: c.surfaceContainer,
        padding: 4,
        borderRadius: radius.pill,
      }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressFeedback
            key={o.value}
            haptic="select"
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              {
                flex: grow ? 1 : undefined,
                minHeight: 34,
                paddingHorizontal: space.lg,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected
                  ? dark
                    ? c.surfaceContainerHighest
                    : c.surfaceContainerLow
                  : 'transparent',
              },
              selected && thumb,
            ]}>
            <Text
              style={{
                fontFamily: fonts.bold,
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
