import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PressFeedback } from '@/components/PressFeedback';
import { contrastText } from '@/utils/palette';
import { radius, space, useColors, useFontFamily } from '@/utils/theme';

export interface SettingsRowProps {
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  /** Leading mark before the label, such as a calendar's colour square. */
  left?: ReactNode;
  /** An icon in a coloured badge before the label. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** The badge fill, a hex colour. Defaults to the accent. */
  iconColor?: string;
  /** Trailing control or value: a `Switch`, a value, a chevron. */
  right?: ReactNode;
  /**
   * Controls after the label that stay outside the row's press target, for a pressable row that
   * also holds its own buttons or switches (a button cannot contain another button).
   */
  trailing?: ReactNode;
  /** Makes the whole row a button. */
  onPress?: () => void;
  disabled?: boolean;
  /** Draws the label in the error colour, for sign out / delete rows. */
  destructive?: boolean;
  /** Rendered below the label inside the same row, for pickers and inline forms. */
  children?: ReactNode;
}

/** One setting: label and hint on the left, control on the right, optional content below. */
export function SettingsRow({
  label,
  hint,
  left,
  icon,
  iconColor,
  right,
  trailing,
  onPress,
  disabled,
  destructive,
  children,
}: SettingsRowProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const badge = iconColor ?? c.primary;
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {!!icon && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.sm,
              backgroundColor: badge,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name={icon} size={18} color={contrastText(badge)} />
          </View>
        )}
        {left}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontFamily: fonts.medium,
              color: destructive ? c.error : c.onSurface,
              fontSize: 15,
              lineHeight: 20,
            }}>
            {label}
          </Text>
          {!!hint && (
            <Text
              style={{
                fontFamily: fonts.regular,
                color: c.onSurfaceVariant,
                fontSize: 13,
                lineHeight: 18,
                marginTop: space.xs,
              }}>
              {hint}
            </Text>
          )}
        </View>
        {right}
      </View>
      {!!children && <View style={{ marginTop: space.md }}>{children}</View>}
    </>
  );
  const style = {
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  } as const;
  if (!onPress) return <View style={style}>{content}</View>;
  const row = (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={trailing ? { ...style, flex: 1, minWidth: 0 } : style}>
      {content}
    </PressFeedback>
  );
  if (!trailing) return row;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {row}
      <View style={{ paddingRight: space.lg }}>{trailing}</View>
    </View>
  );
}
