import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressFeedback } from '@/components/PressFeedback';
import { Segmented } from '@/components/Chip';
import { useThemeStore, ACCENTS, type Mode } from '@/store/themeStore';
import { radius, space, useColors, useIsDark } from '@/utils/theme';
import { SettingsSwitch } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

const MODE_OPTIONS: readonly { value: Mode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function AppearanceSettings() {
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
  const c = useColors();
  const router = useRouter();

  return (
    <View>
      <SettingsSection title="Theme">
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

      <SettingsSection title="Screens">
        <SettingsRow
          label="Friendly greetings"
          hint="Show the headings and taglines on Tasks, Calendar, and Notes"
          right={
            <SettingsSwitch
              label="Friendly greetings"
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
    </View>
  );
}
