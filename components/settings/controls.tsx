import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { mix } from '@/utils/palette';
import { radius, space, useColors, useFontFamily } from '@/utils/theme';

/** Themed switch for the right side of a `SettingsRow`. */
export function SettingsSwitch(props: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors();
  // The Pressable keeps a toggle from also pressing a row that has its own `onPress`; on web the
  // click would bubble to it. `activeThumbColor` is react-native-web's name for the on-state thumb.
  return (
    <Pressable accessible={false} onPress={() => {}}>
      <Switch
        accessibilityLabel={props.label}
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
        trackColor={{ false: c.surfaceContainerHighest, true: c.primary }}
        thumbColor={props.value ? c.onPrimary : c.outline}
        {...({ activeThumbColor: c.onPrimary } as object)}
      />
    </Pressable>
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
          minHeight: 52,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
        },
        style,
      ]}
    />
  );
}

/** Button for forms inside a row, styled like `FormButton`. `primary` is the form's main action. */
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
      haptic={props.primary ? 'tap' : 'select'}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled, selected: props.selected }}
      disabled={props.disabled || props.busy}
      onPress={props.onPress}
      style={{
        flex: props.grow ? 1 : undefined,
        minHeight: 52,
        paddingHorizontal: space.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: filled ? c.primary : c.surfaceContainer,
        opacity: props.disabled ? 0.5 : 1,
      }}>
      {props.busy ? (
        <ActivityIndicator size="small" color={filled ? c.onPrimary : c.primary} />
      ) : (
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 15,
            color: filled ? c.onPrimary : c.onSurface,
            textAlign: 'center',
          }}>
          {props.label}
        </Text>
      )}
    </PressFeedback>
  );
}

/** Inline message row for a section: an error by default, a success, or a neutral notice. */
export function SettingsMessage({
  text,
  notice,
  tone = notice ? 'notice' : 'error',
}: {
  text: string;
  /** Shorthand for `tone="notice"`. */
  notice?: boolean;
  tone?: 'error' | 'success' | 'notice';
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const ink = tone === 'error' ? c.onErrorContainer : tone === 'success' ? c.success : c.onSurface;
  const fill =
    tone === 'error'
      ? c.errorContainer
      : tone === 'success'
        ? mix(c.surface, c.success, 0.16)
        : c.accentSoft;
  return (
    <View style={{ paddingHorizontal: space.md, paddingVertical: space.sm }}>
      <Text
        accessibilityRole="alert"
        style={{
          fontFamily: fonts.medium,
          color: ink,
          backgroundColor: fill,
          borderRadius: radius.md,
          overflow: 'hidden',
          fontSize: 14,
          lineHeight: 20,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
        }}>
        {text}
      </Text>
    </View>
  );
}
