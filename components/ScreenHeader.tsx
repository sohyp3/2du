import type { ReactNode } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DISPLAY_FONT, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

/** A round 44×44 header button, for the `actions` slot of `ScreenHeader`. */
export function HeaderAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <PressFeedback
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceContainer,
        opacity: disabled ? 0.5 : 1,
      }}>
      <Ionicons name={icon} size={20} color={c.onSurface} />
    </PressFeedback>
  );
}

/** The title block every tab starts with: display title, optional subtitle, actions. */
export function ScreenHeader({
  title,
  subtitle,
  actions,
  emoji,
  inset = true,
  showSettings = false,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Shown before the title. */
  emoji?: string;
  /** Pad for the status bar; off when the parent already does. */
  inset?: boolean;
  /** A gear that opens Settings, on phones (the desktop sidebar has its own link). */
  showSettings?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const insets = useSafeAreaInsets();
  const phone = useWindowDimensions().width < 1000;
  const gear = showSettings && phone;
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
          {emoji ? `${emoji} ` : ''}
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              ...type.body,
              marginTop: 2,
            }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions || gear ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {actions}
          {gear && (
            <HeaderAction
              icon="settings-outline"
              label="Settings"
              onPress={() => router.push('/settings')}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
