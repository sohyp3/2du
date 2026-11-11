import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PressFeedback } from '@/components/PressFeedback';
import { setSetting } from '@/db/database';
import { useCalendarStore } from '@/store/calendarStore';
import { useSyncStore } from '@/store/syncStore';
import { scheduleBriefNotification } from '@/utils/notifications';
import { useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsMessage, SettingsSwitch } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection, SPACE } from './SettingsSection';

interface Prefs {
  brief_enabled: boolean;
  brief_time: string;
  brief_lang: 'en' | 'ar';
}

const pad = (n: number) => String(n).padStart(2, '0');

export function BriefSettings() {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const connected = useSyncStore((s) => !!s.token);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    let alive = true;
    useSyncStore
      .getState()
      .request('prefs')
      .then((p) => alive && setPrefs(p))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load settings'));
    return () => {
      alive = false;
    };
  }, [connected]);

  if (!connected)
    return (
      <SettingsSection title="Daily brief">
        <SettingsRow
          label="Connect to your sync server to use the daily brief"
          onPress={() => router.push({ pathname: '/settings', params: { tab: 'sync' } })}
        />
      </SettingsSection>
    );

  const change = async (patch: Partial<Prefs>) => {
    if (!prefs) return;
    const before = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setError(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await useSyncStore
        .getState()
        .request('prefs', { method: 'PATCH', body: JSON.stringify({ ...patch, tz }) });
      await setSetting('brief_enabled', String(next.brief_enabled));
      await setSetting('brief_time', next.brief_time);
      await setSetting('brief_lang', next.brief_lang);
      await setSetting('brief_tz', tz);
      await scheduleBriefNotification(next.brief_enabled, next.brief_time);
    } catch (e) {
      setPrefs(before);
      setError(e instanceof Error ? e.message : 'Could not save the change');
    }
  };

  const [hour, minute] = (prefs?.brief_time ?? '08:00').split(':').map(Number);
  const step = (dh: number, dm: number) => {
    let total = (hour * 60 + minute + dh * 60 + dm * 5 + 24 * 60) % (24 * 60);
    if (dm) total = Math.floor(total / 5) * 5;
    void change({ brief_time: `${pad(Math.floor(total / 60))}:${pad(total % 60)}` });
  };
  const shownHour = timeFormat === '24h' ? pad(hour) : String(hour % 12 === 0 ? 12 : hour % 12);
  const suffix = timeFormat === '24h' ? '' : hour < 12 ? ' AM' : ' PM';

  const stepper = (label: string, value: string, minus: () => void, plus: () => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Earlier ${label}`}
        onPress={minus}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 20 }}>−</Text>
      </PressFeedback>
      <Text
        style={{
          color: c.onSurface,
          fontFamily: fonts.medium,
          fontSize: 16,
          minWidth: 24,
          textAlign: 'center',
        }}>
        {value}
      </Text>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Later ${label}`}
        onPress={plus}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 20 }}>+</Text>
      </PressFeedback>
    </View>
  );

  return (
    <SettingsSection
      title="Daily brief"
      footer="Written on your server each morning and synced to your devices.">
      {!prefs && !error ? (
        <View style={{ padding: SPACE.lg }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : null}
      {prefs && (
        <>
          <SettingsRow
            label="Daily brief"
            right={
              <SettingsSwitch
                label="Daily brief"
                value={prefs.brief_enabled}
                onValueChange={(v) => void change({ brief_enabled: v })}
              />
            }
          />
          <SettingsRow
            label="Time"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {stepper(
                  'hour',
                  shownHour,
                  () => step(-1, 0),
                  () => step(1, 0)
                )}
                <Text style={{ color: c.onSurface, fontFamily: fonts.medium }}>:</Text>
                {stepper(
                  'minute',
                  pad(minute),
                  () => step(0, -1),
                  () => step(0, 1)
                )}
                {!!suffix && (
                  <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular }}>
                    {suffix}
                  </Text>
                )}
              </View>
            }
          />
          <SettingsRow label="Language">
            <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
              <SettingsButton
                label="English"
                grow
                selected={prefs.brief_lang === 'en'}
                onPress={() => void change({ brief_lang: 'en' })}
              />
              <SettingsButton
                label="العربية"
                grow
                selected={prefs.brief_lang === 'ar'}
                onPress={() => void change({ brief_lang: 'ar' })}
              />
            </View>
          </SettingsRow>
        </>
      )}
      {!!error && <SettingsMessage text={error} />}
    </SettingsSection>
  );
}
