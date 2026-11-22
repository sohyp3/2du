import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { CalendarSettings } from '@/components/CalendarSettings';
import { PressFeedback } from '@/components/PressFeedback';
import { exportData, importData, ImportExportError } from '@/db/importExport';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useNoteStore } from '@/store/noteStore';
import { useThemeStore, ACCENTS, type Mode } from '@/store/themeStore';
import { useTodoStore } from '@/store/todoStore';
import { radius, space, useColors, useFontFamily, useIsDark } from '@/utils/theme';
import { Segmented } from '@/components/Chip';
import { SettingsButton, SettingsSwitch } from './controls';
import { BriefSettings } from './BriefSettings';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

const MODE_OPTIONS: readonly { value: Mode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function GeneralSettings() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const isDark = useIsDark();
  const zenMode = useThemeStore((s) => s.zenMode);
  const setZenMode = useThemeStore((s) => s.setZenMode);
  const groupByCalendar = useThemeStore((s) => s.groupByCalendar);
  const setGroupByCalendar = useThemeStore((s) => s.setGroupByCalendar);
  const showGreeting = useThemeStore((s) => s.showGreeting);
  const setShowGreeting = useThemeStore((s) => s.setShowGreeting);
  const themeLoading = useThemeStore((s) => s.isLoading);
  const dayViewStartHour = useCalendarStore((s) => s.dayViewStartHour);
  const setDayViewStartHour = useCalendarStore((s) => s.setDayViewStartHour);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const setTimeFormat = useCalendarStore((s) => s.setTimeFormat);
  const calendarLoading = useCalendarStore((s) => s.isLoading);
  const c = useColors();
  const fonts = useFontFamily();
  const router = useRouter();
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const loadNotes = useNoteStore((s) => s.loadNotes);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const transferring = isExporting || isImporting;

  const formatHour = (h: number) => {
    if (timeFormat === '24h') {
      return `${String(h).padStart(2, '0')}:00`;
    }
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportData();
    } catch (error) {
      const message = error instanceof ImportExportError ? error.message : 'Failed to export data';
      Alert.alert('Export Failed', message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await importData();
      if (result.success) {
        await loadTodos();
        await loadNotes();
        await useCalendarsStore.getState().load();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Import failed', message);
    } finally {
      setIsImporting(false);
    }
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
      <SettingsSection title="Appearance">
        <SettingsRow label="Mode">
          <Segmented grow options={MODE_OPTIONS} value={mode} onChange={(m) => void setMode(m)} />
        </SettingsRow>
        <SettingsRow label="Accent">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {ACCENTS.map((a) => {
              const selected = a.key === accent;
              return (
                <PressFeedback
                  key={a.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.label} accent`}
                  accessibilityState={{ selected, disabled: themeLoading }}
                  onPress={() => setAccent(a.key)}
                  disabled={themeLoading}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    borderWidth: 3,
                    borderColor: selected ? c.onSurface : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: themeLoading ? 0.5 : 1,
                  }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.pill,
                      backgroundColor: isDark ? a.dark : a.light,
                    }}
                  />
                </PressFeedback>
              );
            })}
          </View>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Tasks screen">
        <SettingsRow
          label="Screen greetings"
          hint="Show the headings and taglines on Tasks, Calendar, and Notes"
          right={
            <SettingsSwitch
              label="Show screen greetings"
              value={showGreeting}
              onValueChange={setShowGreeting}
              disabled={themeLoading}
            />
          }
        />
        <SettingsRow
          label="Group by calendar"
          hint="Group tasks under each calendar on the Tasks screen"
          right={
            <SettingsSwitch
              label="Group by calendar"
              value={groupByCalendar}
              onValueChange={setGroupByCalendar}
              disabled={themeLoading}
            />
          }
        />
        <SettingsRow
          label="Zen mode"
          hint="Hide the tab bar and swipe left or right to move between tabs"
          right={
            <SettingsSwitch
              label="Zen mode"
              value={zenMode}
              onValueChange={async (v) => {
                await setZenMode(v);
                if (v) router.replace('/');
              }}
              disabled={themeLoading}
            />
          }
        />
      </SettingsSection>

      <BriefSettings />

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

      <SettingsSection
        title="Data"
        footer="Export saves everything to a JSON file. Import merges a previous backup without removing other records.">
        <SettingsRow
          label="Export"
          onPress={handleExport}
          disabled={transferring}
          right={
            isExporting ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <Ionicons name="download-outline" size={20} color={c.onSurfaceVariant} />
            )
          }
        />
        <SettingsRow
          label="Import"
          onPress={handleImport}
          disabled={transferring}
          right={
            isImporting ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <Ionicons name="push-outline" size={20} color={c.onSurfaceVariant} />
            )
          }
        />
      </SettingsSection>
    </View>
  );
}
