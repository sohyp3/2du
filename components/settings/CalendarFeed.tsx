import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { PressFeedback } from '@/components/PressFeedback';
import { Chip, ColorChip } from '@/components/Chip';
import { feedUrls } from '@/shared/feedUrl';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useSyncStore, type ApiKey } from '@/store/syncStore';
import { AuthError, NetworkError } from '@/utils/http';
import { contrastText } from '@/utils/palette';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsMessage } from './controls';
import { CopyBox, relative } from './KeysSettings';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

const TITLE = '📲 Add 2du to your calendar app';

const HOW_TO: [string, string][] = [
  ['Google', 'Other calendars → From URL'],
  ['Apple', 'File → New Calendar Subscription'],
  ['Outlook', 'Add calendar → Subscribe from web'],
];

/** A tonal pill that stands out on the soft success card. */
function OpenButton({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <PressFeedback
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: 160,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        minHeight: 48,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        backgroundColor: c.surfaceContainerLow,
      }}>
      <Ionicons name={icon} size={18} color={c.primary} />
      <Text style={{ fontFamily: fonts.bold, color: c.onSurface, fontSize: 15 }}>{label}</Text>
    </PressFeedback>
  );
}

function FeedRow({ k, busy, onRevoke }: { k: ApiKey; busy: boolean; onRevoke: () => void }) {
  const c = useColors(),
    fonts = useFontFamily();
  const calendars = useCalendarsStore((s) => s.calendars);
  const [confirm, setConfirm] = useState(false);
  const ids = k.meta?.calendar_ids;
  return (
    <SettingsRow
      label={k.name}
      hint={`Last used ${k.last_used ? relative(k.last_used) : 'never'}`}
      right={
        !confirm && (
          <SettingsButton label="Revoke" disabled={busy} onPress={() => setConfirm(true)} />
        )
      }>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {ids?.length ? (
          ids.map((id) => {
            const cal = calendars.find((x) => x.id === id);
            const fill = cal?.color ?? c.surfaceContainerHighest;
            return (
              <View
                key={id}
                style={{
                  backgroundColor: fill,
                  borderRadius: radius.pill,
                  paddingHorizontal: space.sm,
                  paddingVertical: 2,
                }}>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    color: cal ? contrastText(cal.color) : c.onSurface,
                    ...type.caption,
                  }}>
                  {cal?.name ?? 'Deleted calendar'}
                </Text>
              </View>
            );
          })
        ) : (
          <View
            style={{
              backgroundColor: c.surfaceContainerHighest,
              borderRadius: radius.pill,
              paddingHorizontal: space.sm,
              paddingVertical: 2,
            }}>
            <Text style={{ fontFamily: fonts.bold, color: c.onSurface, ...type.caption }}>
              All calendars
            </Text>
          </View>
        )}
      </View>
      {confirm && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginTop: space.md,
          }}>
          <Text style={{ flex: 1, fontFamily: fonts.medium, color: c.onSurface, ...type.body }}>
            Revoke? Calendar apps stop getting updates.
          </Text>
          <SettingsButton label="Yes" destructive disabled={busy} onPress={onRevoke} />
          <SettingsButton label="No" onPress={() => setConfirm(false)} />
        </View>
      )}
    </SettingsRow>
  );
}

/** Calendar feed links: subscribe to 2du tasks from Google, Apple or Outlook Calendar. */
export function CalendarFeed() {
  const router = useRouter();
  const token = useSyncStore((s) => s.token),
    url = useSyncStore((s) => s.url),
    busy = useSyncStore((s) => s.busy),
    keys = useSyncStore((s) => s.keys),
    loadKeys = useSyncStore((s) => s.loadKeys),
    createKey = useSyncStore((s) => s.createKey),
    revokeKey = useSyncStore((s) => s.revokeKey);
  const calendars = useCalendarsStore((s) => s.calendars);
  const c = useColors(),
    fonts = useFontFamily();
  const [picked, setPicked] = useState<string[]>([]),
    [newKey, setNewKey] = useState(''),
    [error, setError] = useState(''),
    [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token)
      loadKeys().catch((e) => {
        if (!(e instanceof NetworkError || e instanceof AuthError)) setError(e.message);
      });
  }, [token, loadKeys]);

  if (!token) {
    return (
      <SettingsSection title={TITLE}>
        <SettingsRow
          label="Sign in to add 2du to your calendar app"
          icon="calendar-outline"
          onPress={() => router.setParams({ section: 'account' })}
          right={<Ionicons name="chevron-forward" size={18} color={c.onSurfaceVariant} />}
        />
      </SettingsSection>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };
  // Calendars deleted since they were picked drop out of the choice.
  const chosen = calendars.filter((cal) => picked.includes(cal.id));
  const create = () =>
    run(async () => {
      setCreating(true);
      try {
        const subset = chosen.length > 0;
        const names = chosen.map((cal) => cal.name).join(', ');
        const { key } = await createKey(
          'Calendar feed' + (subset ? ': ' + names : ''),
          'feed',
          subset ? { calendar_ids: chosen.map((cal) => cal.id) } : {}
        );
        setNewKey(key);
        setPicked([]);
      } finally {
        setCreating(false);
      }
    });
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const feeds = keys.filter((k) => k.scope === 'feed');
  const links = newKey ? feedUrls(url, newKey) : null;
  const open = (link: string) => run(() => Linking.openURL(link).then(() => undefined));

  return (
    <SettingsSection
      title={TITLE}
      footer="Your tasks with a date show up in Google, Apple or Outlook Calendar. Updates every 30 minutes or so.">
      {!!error && <SettingsMessage text={error} />}
      {links ? (
        <View style={{ padding: space.md }}>
          <Card tone="soft" style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="checkmark-circle" size={22} color={c.success} />
              <Text style={{ flex: 1, fontFamily: fonts.bold, color: c.onSurface, ...type.body }}>
                Copy it now. To get a new link, create another.
              </Text>
            </View>
            <CopyBox label="calendar link" text={links.https} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <OpenButton
                icon="calendar"
                label="Open in Calendar"
                hint="Apple Calendar or Outlook"
                onPress={() => void open(links.webcal)}
              />
              <OpenButton
                icon="logo-google"
                label="Google Calendar"
                onPress={() => void open(links.google)}
              />
            </View>
            <View style={{ gap: space.xs }}>
              {HOW_TO.map(([app, how]) => (
                <Text
                  key={app}
                  style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.label }}>
                  <Text style={{ fontFamily: fonts.bold, color: c.onSurface }}>{app}: </Text>
                  {how}
                </Text>
              ))}
            </View>
            <SettingsButton label="Done" primary onPress={() => setNewKey('')} />
          </Card>
        </View>
      ) : (
        <SettingsRow label="New link" hint="Choose which calendars it includes">
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <Chip
                label="All calendars"
                selected={chosen.length === 0}
                onPress={() => setPicked([])}
              />
              {calendars.map((cal) => (
                <ColorChip
                  key={cal.id}
                  label={cal.name}
                  color={cal.color}
                  icon={picked.includes(cal.id) ? 'checkmark' : undefined}
                  selected={picked.includes(cal.id)}
                  onPress={() => toggle(cal.id)}
                />
              ))}
            </View>
            <SettingsButton
              label="Create link"
              primary
              busy={creating}
              disabled={busy || creating}
              onPress={() => void create()}
            />
          </View>
        </SettingsRow>
      )}
      {feeds.map((k) => (
        <FeedRow key={k.id} k={k} busy={busy} onRevoke={() => void run(() => revokeKey(k.id))} />
      ))}
    </SettingsSection>
  );
}
