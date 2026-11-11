import type { ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DISPLAY_FONT, space, type, useColors, useFontFamily } from '@/utils/theme';

/** The title block every tab starts with: display title, optional quiet subtitle, actions. */
export function ScreenHeader({
  title,
  subtitle,
  actions,
  inset = true,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Pad for the status bar; off when the parent already does. */
  inset?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingTop: inset ? (Platform.OS === 'web' ? space.xl : insets.top + space.md) : 0,
        paddingBottom: space.md,
      }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontFamily: DISPLAY_FONT, color: c.onSurface, ...type.display }}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              ...type.label,
              marginTop: 2,
            }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>{actions}</View>
      ) : null}
    </View>
  );
}
