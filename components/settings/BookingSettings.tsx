import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarPicker } from '@/components/CalendarPicker';
import { PressFeedback } from '@/components/PressFeedback';
import { useCalendarStore } from '@/store/calendarStore';
import { useSyncStore } from '@/store/syncStore';
import { defaultLink, linkErrors, slugify, type BookingLink } from '@/shared/bookingLink';
import { shareLink } from '@/utils/shareLink';
import { useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsMessage, SettingsSwitch } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection, SPACE } from './SettingsSection';

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const NOTICE = [
  ['None', 0],
  ['1 hour', 60],
  ['2 hours', 120],
  ['1 day', 1440],
] as const;
const HORIZON = [
  ['1 week', 7],
  ['2 weeks', 14],
  ['1 month', 30],
] as const;
const BUFFER = [
  ['None', 0],
  ['10', 10],
  ['15', 15],
  ['30', 30],
] as const;
// The app's week starts on Monday.
const DAYS: [string, number][] = [
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
  ['Sun', 0],
];
const pad = (n: number) => String(n).padStart(2, '0');

export function BookingSettings() {
  const c = useColors(),
    fonts = useFontFamily();
  const url = useSyncStore((s) => s.url);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [links, setLinks] = useState<BookingLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{
    link: BookingLink;
    isNew: boolean;
    slugEdited: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const api = (path: string, options?: RequestInit) =>
    useSyncStore.getState().request(`booking${path}`, options);

  useEffect(() => {
    let alive = true;
    api('')
      .then((l) => alive && setLinks(l))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load links'));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (link: BookingLink, enabled: boolean) => {
    setError(null);
    setLinks((ls) => ls && ls.map((l) => (l.slug === link.slug ? { ...l, enabled } : l)));
    try {
      await api(`/${link.slug}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
    } catch (e) {
      setLinks(
        (ls) => ls && ls.map((l) => (l.slug === link.slug ? { ...l, enabled: !enabled } : l))
      );
      setError(e instanceof Error ? e.message : 'Could not update the link');
    }
  };

  const share = async (link: BookingLink) => {
    try {
      const result = await shareLink(`${url}/book/${link.slug}`);
      setNotice(result === 'copied' ? 'Link copied' : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share the link');
    }
  };

  const save = async () => {
    if (!editor) return;
    const errors = linkErrors(editor.link);
    setProblems(errors);
    if (errors.length) return;
    setBusy(true);
    setError(null);
    try {
      const { slug, ...rest } = editor.link;
      const saved: BookingLink = editor.isNew
        ? await api('', { method: 'POST', body: JSON.stringify(editor.link) })
        : await api(`/${slug}`, { method: 'PATCH', body: JSON.stringify(rest) });
      setLinks((ls) => (ls ?? []).filter((l) => l.slug !== saved.slug).concat(saved));
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the link');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (slug: string) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/${slug}`, { method: 'DELETE' });
      setLinks((ls) => (ls ?? []).filter((l) => l.slug !== slug));
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the link');
    } finally {
      setBusy(false);
    }
  };
  const confirmDelete = (slug: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this booking link?')) void remove(slug);
      return;
    }
    Alert.alert('Delete booking link', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(slug) },
    ]);
  };

  const patch = (p: Partial<BookingLink>) =>
    setEditor((e) => e && { ...e, link: { ...e.link, ...p } });

  const chips = <T extends number>(
    options: readonly (readonly [string, T])[],
    value: T,
    onChange: (v: T) => void
  ) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm }}>
      {options.map(([label, v]) => (
        <SettingsButton key={v} label={label} selected={value === v} onPress={() => onChange(v)} />
      ))}
    </View>
  );

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (timeFormat === '24h') return t;
    return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const timeStepper = (label: string, value: string, onChange: (v: string) => void) => {
    const [h, m] = value.split(':').map(Number);
    const move = (delta: number) => {
      const total = Math.min(24 * 60 - 15, Math.max(0, h * 60 + m + delta));
      onChange(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
    };
    const btn = (name: 'remove' | 'add', delta: number, a11y: string) => (
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={() => move(delta)}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={name} size={20} color={c.primary} />
      </PressFeedback>
    );
    return (
      <SettingsRow
        label={label}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {btn('remove', -15, `Earlier ${label}`)}
            <Text
              style={{
                color: c.onSurface,
                fontFamily: fonts.medium,
                fontSize: 15,
                minWidth: 72,
                textAlign: 'center',
              }}>
              {formatTime(value)}
            </Text>
            {btn('add', 15, `Later ${label}`)}
          </View>
        }
      />
    );
  };

  const e = editor?.link;
  return (
    <SettingsSection
      title="Booking links"
      footer="People can book free time in your availability. Only tasks with a duration block time.">
      {!links && !error && (
        <View style={{ padding: SPACE.lg }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}
      {links?.map((l) => (
        <SettingsRow
          key={l.slug}
          label={l.title}
          hint={`/book/${l.slug}`}
          onPress={() => {
            setProblems([]);
            setEditor({ link: l, isNew: false, slugEdited: true });
          }}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
              <PressFeedback
                accessibilityRole="button"
                accessibilityLabel={`Share ${l.title}`}
                onPress={() => void share(l)}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="share-outline" size={20} color={c.primary} />
              </PressFeedback>
              <SettingsSwitch
                label={`${l.title} enabled`}
                value={l.enabled}
                onValueChange={(v) => void toggle(l, v)}
              />
            </View>
          }
        />
      ))}
      {links && !editor && (
        <SettingsRow
          label="New booking link"
          onPress={() => {
            setProblems([]);
            setEditor({ link: defaultLink(tz, 'daily'), isNew: true, slugEdited: false });
          }}
          right={<Ionicons name="add" size={20} color={c.primary} />}
        />
      )}
      {editor && e && (
        <>
          <SettingsRow label="Title">
            <SettingsInput
              value={e.title}
              maxLength={100}
              onChangeText={(title) =>
                patch(editor.slugEdited ? { title } : { title, slug: slugify(title) })
              }
            />
          </SettingsRow>
          <SettingsRow label="Link name" hint={`${url}/book/${e.slug || '…'}`}>
            <SettingsInput
              value={e.slug}
              editable={editor.isNew}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={40}
              onChangeText={(slug) => {
                setEditor((s) => s && { ...s, slugEdited: true });
                patch({ slug: slug.toLowerCase() });
              }}
            />
          </SettingsRow>
          <SettingsRow label="Length (minutes)">
            {chips(
              DURATIONS.map((d) => [String(d), d] as const),
              e.duration_min,
              (duration_min) => patch({ duration_min })
            )}
          </SettingsRow>
          <SettingsRow label="Days">
            <View style={{ flexDirection: 'row', gap: SPACE.xs, marginTop: SPACE.sm }}>
              {DAYS.map(([label, d]) => {
                const on = e.days.includes(d);
                return (
                  <PressFeedback
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() =>
                      patch({
                        days: on ? e.days.filter((x) => x !== d) : [...e.days, d].sort(),
                      })
                    }
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? c.primary : c.surfaceContainerHigh,
                    }}>
                    <Text
                      style={{
                        color: on ? c.onPrimary : c.onSurface,
                        fontFamily: fonts.medium,
                        fontSize: 12,
                      }}>
                      {label}
                    </Text>
                  </PressFeedback>
                );
              })}
            </View>
          </SettingsRow>
          {timeStepper('From', e.start, (start) => patch({ start }))}
          {timeStepper('To', e.end, (end) => patch({ end }))}
          <SettingsRow label="Calendar" hint="Bookings are added here">
            <CalendarPicker
              all={false}
              value={e.calendar_id}
              onChange={(id) => id && patch({ calendar_id: id })}
            />
          </SettingsRow>
          <SettingsRow label="Minimum notice">
            {chips(NOTICE, e.notice_min, (notice_min) => patch({ notice_min }))}
          </SettingsRow>
          <SettingsRow label="Book up to">
            {chips(HORIZON, e.horizon_days, (horizon_days) => patch({ horizon_days }))}
          </SettingsRow>
          <SettingsRow label="Gap around busy time (minutes)">
            {chips(BUFFER, e.buffer_min, (buffer_min) => patch({ buffer_min }))}
          </SettingsRow>
          <SettingsRow label="Time zone" hint={e.tz} />
          {problems.map((p) => (
            <SettingsMessage key={p} text={p} />
          ))}
          <View style={{ flexDirection: 'row', gap: SPACE.sm, padding: SPACE.lg }}>
            <SettingsButton label="Cancel" grow disabled={busy} onPress={() => setEditor(null)} />
            <SettingsButton label="Save" grow primary busy={busy} onPress={() => void save()} />
          </View>
          {!editor.isNew && (
            <SettingsRow
              destructive
              label="Delete link"
              disabled={busy}
              onPress={() => confirmDelete(e.slug)}
            />
          )}
        </>
      )}
      {!!notice && <SettingsMessage notice text={notice} />}
      {!!error && <SettingsMessage text={error} />}
    </SettingsSection>
  );
}
