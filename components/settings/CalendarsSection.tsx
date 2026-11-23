import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarSettings } from '@/components/CalendarSettings';
import { PressFeedback } from '@/components/PressFeedback';
import { useCalendarStore } from '@/store/calendarStore';
import { space, useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function CalendarsSection() {
  const dayViewStartHour = useCalendarStore((s) => s.dayViewStartHour);
  const setDayViewStartHour = useCalendarStore((s) => s.setDayViewStartHour);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const setTimeFormat = useCalendarStore((s) => s.setTimeFormat);
  const calendarLoading = useCalendarStore((s) => s.isLoading);
  const c = useColors();
  const fonts = useFontFamily();

  const formatHour = (h: number) => {
    if (timeFormat === '24h') {
      return `${String(h).padStart(2, '0')}:00`;
    }
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  const stepHour = (label: string, icon: 'remove' | 'add', next: number) => {
    const disabled = calendarLoading || next === dayViewStartHour;
    return (
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setDayViewStartHour(next)}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: c.surfaceContainerHigh,
          opacity: disabled ? 0.5 : 1,
        }}>
        <Ionicons name={icon} size={18} color={c.onSurface} />
      </PressFeedback>
    );
  };

  return (
    <View>
      <CalendarSettings />

      <SettingsSection title="Calendar view">
        <SettingsRow label="Time format">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {(['12h', '24h'] as const).map((f) => (
              <SettingsButton
                key={f}
                grow
                label={f === '12h' ? '12 hour' : '24 hour'}
                selected={f === timeFormat}
                disabled={calendarLoading}
                onPress={() => setTimeFormat(f)}
              />
            ))}
          </View>
        </SettingsRow>
        <SettingsRow
          label="Day view start hour"
          hint="The first hour shown when you open a day"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              {stepHour('Start one hour earlier', 'remove', Math.max(0, dayViewStartHour - 1))}
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  fontFamily: fonts.medium,
                  color: c.onSurface,
                  fontSize: 15,
                  minWidth: 56,
                  textAlign: 'center',
                  fontVariant: ['tabular-nums'],
                }}>
                {formatHour(dayViewStartHour)}
              </Text>
              {stepHour('Start one hour later', 'add', Math.min(23, dayViewStartHour + 1))}
            </View>
          }
        />
      </SettingsSection>
    </View>
  );
}
