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
import { useThemeStore, THEMES, FONTS, FONT_FAMILIES } from '@/store/themeStore';
import { useTodoStore } from '@/store/todoStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsSwitch } from './controls';
import { BriefSettings } from './BriefSettings';
import { SettingsRow } from './SettingsRow';
import { SettingsSection, SPACE } from './SettingsSection';

export function GeneralSettings() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const fontKey = useThemeStore((s) => s.fontKey);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setFont = useThemeStore((s) => s.setFont);
  const debugMode = useThemeStore((s) => s.debugMode);
  const setDebugMode = useThemeStore((s) => s.setDebugMode);
  const zenMode = useThemeStore((s) => s.zenMode);
  const setZenMode = useThemeStore((s) => s.setZenMode);
  const groupByCalendar = useThemeStore((s) => s.groupByCalendar);
  const setGroupByCalendar = useThemeStore((s) => s.setGroupByCalendar);
  const showGreeting = useThemeStore((s) => s.showGreeting);
  const setShowGreeting = useThemeStore((s) => s.setShowGreeting);
  const themeLoading = useThemeStore((s) => s.isLoading);
  const [showPlusPrompt, setShowPlusPrompt] = useState(false);
  const [plusPassword, setPlusPassword] = useState('');
  const [isActivating, setIsActivating] = useState(false);
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

  const handleActivateDebug = async () => {
    setIsActivating(true);
    try {
      if (plusPassword === 'hehe') {
        await setDebugMode(true);
        setShowPlusPrompt(false);
        setPlusPassword('');
      } else {
        Alert.alert('Wrong code', 'That activation code is incorrect.');
        setPlusPassword('');
      }
    } finally {
      setIsActivating(false);
    }
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
        <SettingsRow label="Theme">
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
            {THEMES.map((t) => {
              const selected = t.key === themeKey;
              return (
                <PressFeedback
                  key={t.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.label} theme`}
                  accessibilityState={{ selected, disabled: themeLoading }}
                  onPress={() => setTheme(t.key)}
                  disabled={themeLoading}
                  style={{
                    flex: 1,
                    minHeight: 88,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACE.sm,
                    padding: SPACE.md,
                    borderRadius: 12,
                    borderWidth: 2,
                    backgroundColor: t.preview.bg,
                    borderColor: selected ? c.primary : c.outlineVariant,
                    opacity: themeLoading ? 0.5 : 1,
                  }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: t.preview.accent,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 13,
                      lineHeight: 18,
                      textAlign: 'center',
                      color: THEME_PREVIEW_TEXT[t.key === 'silver' ? 'light' : 'dark'],
                    }}>
                    {t.label}
                  </Text>
                </PressFeedback>
              );
            })}
          </View>
        </SettingsRow>
        <SettingsRow label="Font">
          <View style={{ gap: SPACE.xs }}>
            {FONTS.map((f) => {
              const selected = f.key === fontKey;
              const preview = FONT_FAMILIES[f.key];
              return (
                <PressFeedback
                  key={f.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.label} font`}
                  accessibilityState={{ selected, disabled: themeLoading }}
                  onPress={() => setFont(f.key)}
                  disabled={themeLoading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACE.md,
                    minHeight: 56,
                    paddingHorizontal: SPACE.md,
                    paddingVertical: SPACE.sm,
                    borderRadius: 8,
                    backgroundColor: selected ? c.surfaceContainerHigh : 'transparent',
                    opacity: themeLoading ? 0.5 : 1,
                  }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{
                        fontFamily: preview.bold,
                        color: c.onSurface,
                        fontSize: 17,
                        lineHeight: 22,
                      }}>
                      {f.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: preview.regular,
                        color: c.onSurfaceVariant,
                        fontSize: 14,
                        lineHeight: 20,
                      }}>
                      The quick brown fox jumps over the lazy dog
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={20} color={c.primary} />}
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
          hint="Show a card for each calendar on the Tasks screen"
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
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
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

      <SettingsSection title="Advanced">
        {debugMode ? (
          <SettingsRow
            label="Debug mode"
            right={
              <Text style={{ fontFamily: fonts.medium, color: c.primary, fontSize: 14 }}>
                Active
              </Text>
            }
          />
        ) : !showPlusPrompt ? (
          <SettingsRow
            label="Activate debug"
            onPress={() => setShowPlusPrompt(true)}
            right={<Ionicons name="chevron-forward" size={18} color={c.onSurfaceVariant} />}
          />
        ) : (
          <SettingsRow label="Enter activation code">
            <View style={{ gap: SPACE.md }}>
              <SettingsInput
                accessibilityLabel="Activation code"
                value={plusPassword}
                onChangeText={setPlusPassword}
                onSubmitEditing={handleActivateDebug}
                secureTextEntry
                autoFocus
                placeholder="Password"
                editable={!isActivating}
              />
              <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
                <SettingsButton
                  grow
                  label="Cancel"
                  disabled={isActivating}
                  onPress={() => {
                    setShowPlusPrompt(false);
                    setPlusPassword('');
                  }}
                />
                <SettingsButton
                  grow
                  primary
                  label="Activate"
                  busy={isActivating}
                  onPress={handleActivateDebug}
                />
              </View>
            </View>
          </SettingsRow>
        )}
      </SettingsSection>
    </View>
  );
}

// Theme swatches show another theme's background, so their label cannot use the active
// theme's text colour. These are the two swatch-label inks the screen already used.
const THEME_PREVIEW_TEXT = { dark: '#ece4d4', light: '#1a1a1a' } as const;
