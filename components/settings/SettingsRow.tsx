import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { useColors, useFontFamily } from '@/utils/theme';
import { SPACE } from './SettingsSection';

export interface SettingsRowProps {
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  /** Leading mark before the label, such as a calendar's colour square. */
  left?: ReactNode;
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
  right,
  trailing,
  onPress,
  disabled,
  destructive,
  children,
}: SettingsRowProps) {
  const c = useColors(),
    fonts = useFontFamily();
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
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
                marginTop: SPACE.xs,
              }}>
              {hint}
            </Text>
          )}
        </View>
        {right}
      </View>
      {!!children && <View style={{ marginTop: SPACE.md }}>{children}</View>}
    </>
  );
  const style = {
    minHeight: 52,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
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
      <View style={{ paddingRight: SPACE.lg }}>{trailing}</View>
    </View>
  );
}
