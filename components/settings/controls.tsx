import { ActivityIndicator, Switch, Text, TextInput, type TextInputProps } from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { useColors, useFontFamily } from '@/utils/theme';
import { SPACE } from './SettingsSection';

/** Themed switch for the right side of a `SettingsRow`. */
export function SettingsSwitch(props: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Switch
      accessibilityLabel={props.label}
      value={props.value}
      onValueChange={props.onValueChange}
      disabled={props.disabled}
      trackColor={{ false: c.outlineVariant, true: c.primary }}
      thumbColor={props.value ? c.onPrimary : c.surfaceContainerHighest}
    />
  );
}

/** Text field for forms inside a row. Callers add spacing with a parent `gap`. */
export function SettingsInput({ style, ...props }: TextInputProps) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <TextInput
      placeholderTextColor={c.outline}
      {...props}
      style={[
        {
          color: c.onSurface,
          backgroundColor: c.surfaceContainerHigh,
          fontFamily: fonts.regular,
          fontSize: 16,
          minHeight: 48,
          paddingHorizontal: SPACE.md,
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

/** Button for forms inside a row. `primary` is the one main action of its form. */
export function SettingsButton(props: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  selected?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** Share the available width with sibling buttons. */
  grow?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const filled = props.primary || props.selected;
  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled, selected: props.selected }}
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      style={{
        flex: props.grow ? 1 : undefined,
        minHeight: 44,
        paddingHorizontal: SPACE.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: filled ? c.primary : c.surfaceContainerHigh,
        opacity: props.disabled ? 0.5 : 1,
      }}>
      {props.busy ? (
        <ActivityIndicator size="small" color={filled ? c.onPrimary : c.primary} />
      ) : (
        <Text
          style={{
            fontFamily: fonts.medium,
            fontSize: 14,
            color: filled ? c.onPrimary : c.onSurface,
            textAlign: 'center',
          }}>
          {props.label}
        </Text>
      )}
    </PressFeedback>
  );
}
