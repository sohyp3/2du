import type { ReactNode } from 'react';
import { ActivityIndicator, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendarStore } from '@/store/calendarStore';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { SettingsSwitch } from './settings/controls';

/** A labelled group in a task form. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <View style={{ marginBottom: space.lg, gap: space.sm }}>
      <Text style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant, ...type.label }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** A borderless tonal text field. */
export function FormInput({ style, multiline, ...props }: TextInputProps) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <TextInput
      placeholderTextColor={c.outline}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...props}
      style={[
        {
          fontFamily: fonts.regular,
          color: c.onSurface,
          backgroundColor: c.surfaceContainer,
          borderRadius: radius.md,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          minHeight: multiline ? 96 : 48,
          writingDirection: 'auto',
          ...type.body,
        },
        style,
      ]}
    />
  );
}

/** Hour and minute steppers. Follows the 12h/24h setting. */
export function TimeStepper({
  hour,
  minute,
  onChange,
  disabled,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const h24 = useCalendarStore((s) => s.timeFormat === '24h');
  const arrow = (label: string, dir: 'back' | 'forward', onPress: () => void) => (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={`chevron-${dir}`} size={18} color={c.onSurfaceVariant} />
    </PressFeedback>
  );
  const value = (text: string) => (
    <Text
      style={{
        width: 32,
        textAlign: 'center',
        fontFamily: fonts.medium,
        color: c.onSurface,
        fontSize: 18,
      }}>
      {text}
    </Text>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceContainer,
        borderRadius: radius.md,
        minHeight: 56,
      }}>
      {arrow('Earlier hour', 'back', () => onChange((hour + 23) % 24, minute))}
      {value(h24 ? hour.toString().padStart(2, '0') : (hour % 12 || 12).toString())}
      {arrow('Later hour', 'forward', () => onChange((hour + 1) % 24, minute))}
      <Text style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant, fontSize: 18 }}>:</Text>
      {arrow('Five minutes earlier', 'back', () => onChange(hour, (minute + 55) % 60))}
      {value(minute.toString().padStart(2, '0'))}
      {arrow('Five minutes later', 'forward', () => onChange(hour, (minute + 5) % 60))}
      {!h24 && (
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={hour < 12 ? 'AM, switch to PM' : 'PM, switch to AM'}
          disabled={disabled}
          onPress={() => onChange(hour < 12 ? hour + 12 : hour - 12, minute)}
          style={{
            marginLeft: space.sm,
            minHeight: 36,
            paddingHorizontal: space.md,
            borderRadius: radius.sm,
            justifyContent: 'center',
            backgroundColor: c.surfaceContainerHighest,
          }}>
          <Text style={{ fontFamily: fonts.medium, color: c.onSurface, ...type.label }}>
            {hour < 12 ? 'AM' : 'PM'}
          </Text>
        </PressFeedback>
      )}
    </View>
  );
}

/** A full-width row with a switch, e.g. "Remind me". */
export function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <PressFeedback
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 56,
        paddingHorizontal: space.lg,
        borderRadius: radius.md,
        backgroundColor: c.surfaceContainer,
        marginBottom: space.lg,
      }}>
      <Text style={{ fontFamily: fonts.regular, color: c.onSurface, ...type.body }}>{label}</Text>
      <SettingsSwitch
        label={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      />
    </PressFeedback>
  );
}

/** Buttons pinned to the bottom of a form, above the keyboard and the home indicator. */
export function FormFooter({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: c.surface,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        paddingBottom: Math.max(insets.bottom, space.md) + space.xs,
      }}>
      <View
        style={{
          flexDirection: 'row',
          gap: space.md,
          width: '100%',
          maxWidth: 760,
          alignSelf: 'center',
        }}>
        {children}
      </View>
    </View>
  );
}

export function FormButton({
  label,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'tonal' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const bg =
    kind === 'primary' ? c.primary : kind === 'danger' ? c.errorContainer : c.surfaceContainer;
  const ink =
    kind === 'primary' ? c.onPrimary : kind === 'danger' ? c.onErrorContainer : c.onSurface;
  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 52,
        borderRadius: radius.lg,
        flexDirection: 'row',
        gap: space.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        opacity: disabled ? 0.5 : 1,
      }}>
      {busy ? (
        <ActivityIndicator color={ink} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={ink} />}
          <Text
            style={{
              fontFamily: kind === 'primary' ? fonts.bold : fonts.medium,
              color: ink,
              ...type.body,
            }}>
            {label}
          </Text>
        </>
      )}
    </PressFeedback>
  );
}
