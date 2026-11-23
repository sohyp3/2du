import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { PressFeedback } from '@/components/PressFeedback';
import { useSyncStore, type ApiKey, type KeyScope } from '@/store/syncStore';
import { AuthError, NetworkError } from '@/utils/http';
import { contrastText, SWATCHES } from '@/utils/palette';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsMessage } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

type AgentScope = Exclude<KeyScope, 'feed'>;

/** The agent key types offered in settings. `feed` keys live in the Calendars section. */
export const KEY_TYPES: {
  scope: AgentScope;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    scope: 'read',
    title: 'Read only',
    description: "Can see your tasks, notes and goals. Can't change anything.",
    icon: 'eye',
    color: SWATCHES[4],
  },
  {
    scope: 'write',
    title: 'Read & write',
    description: 'Full access to tasks, notes, calendars and goals.',
    icon: 'create',
    color: SWATCHES[0],
  },
  {
    scope: 'add',
    title: 'Add only',
    description: "Can add tasks and notes. Can't see anything.",
    icon: 'add-circle',
    color: SWATCHES[3],
  },
  {
    scope: 'book',
    title: 'Booking links only',
    description: 'Can see free times on your booking links and book them.',
    icon: 'link',
    color: SWATCHES[2],
  },
];

const EXPIRY: [string, number | null][] = [
  ['Never', null],
  ['30 days', 30],
  ['90 days', 90],
  ['1 year', 365],
];

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const formatDate = (d: Date | number | string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function relative(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [2592000, 'month'],
    [31536000, 'year'],
  ];
  let [size, name] = units[0];
  for (const u of units) if (s >= u[0]) [size, name] = u;
  const n = Math.floor(s / size);
  return `${n} ${name}${n === 1 ? '' : 's'} ago`;
}

function Badge({ label, fill, ink }: { label: string; fill: string; ink: string }) {
  const fonts = useFontFamily();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: fill,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 2,
      }}>
      <Text style={{ fontFamily: fonts.bold, color: ink, ...type.caption }}>{label}</Text>
    </View>
  );
}

/** A monospace box with a Copy button that confirms for two seconds. */
export function CopyBox({ text, label }: { text: string; label: string }) {
  const c = useColors(),
    fonts = useFontFamily();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: c.surfaceContainerHigh,
        borderRadius: radius.md,
        padding: space.md,
      }}>
      <Text
        selectable
        style={{ flex: 1, minWidth: 0, color: c.onSurface, fontFamily: MONO, ...type.label }}>
        {text}
      </Text>
      <PressFeedback
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={`Copy ${label}`}
        onPress={() => void copy()}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          minHeight: 36,
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: copied ? c.primary : c.surfaceContainerLow,
        }}>
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={16}
          color={copied ? c.onPrimary : c.onSurface}
        />
        <Text
          style={{
            fontFamily: fonts.bold,
            color: copied ? c.onPrimary : c.onSurface,
            ...type.label,
          }}>
          {copied ? 'Copied!' : 'Copy'}
        </Text>
      </PressFeedback>
    </View>
  );
}

function KeyRow({ k, busy, onRevoke }: { k: ApiKey; busy: boolean; onRevoke: () => void }) {
  const c = useColors(),
    fonts = useFontFamily();
  const [confirm, setConfirm] = useState(false);
  const kind = KEY_TYPES.find((t) => t.scope === k.scope);
  const expired = k.expires != null && k.expires <= Date.now();
  const hint = [
    `Created ${formatDate(k.created_at)}`,
    `Last used ${k.last_used ? relative(k.last_used) : 'never'}`,
    `Expire${expired ? 'd' : 's'} ${k.expires == null ? 'never' : formatDate(k.expires)}`,
  ].join(' · ');
  return (
    <SettingsRow
      label={k.name}
      hint={hint}
      right={
        !confirm && (
          <SettingsButton label="Revoke" disabled={busy} onPress={() => setConfirm(true)} />
        )
      }>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Badge
          label={kind?.title ?? k.scope}
          fill={kind?.color ?? c.surfaceContainerHighest}
          ink={kind ? contrastText(kind.color) : c.onSurface}
        />
        {expired && <Badge label="Expired" fill={c.errorContainer} ink={c.onErrorContainer} />}
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
            Revoke?
          </Text>
          <SettingsButton label="Yes" destructive disabled={busy} onPress={onRevoke} />
          <SettingsButton label="No" onPress={() => setConfirm(false)} />
        </View>
      )}
    </SettingsRow>
  );
}

export function KeysSettings() {
  const syncToken = useSyncStore((s) => s.token),
    url = useSyncStore((s) => s.url),
    busy = useSyncStore((s) => s.busy),
    keys = useSyncStore((s) => s.keys),
    loadKeys = useSyncStore((s) => s.loadKeys),
    createKey = useSyncStore((s) => s.createKey),
    revokeKey = useSyncStore((s) => s.revokeKey);
  const c = useColors(),
    fonts = useFontFamily();
  const [keyName, setKeyName] = useState('My agent'),
    [scope, setScope] = useState<AgentScope>('read'),
    [expiry, setExpiry] = useState<number | null>(null),
    [newKey, setNewKey] = useState(''),
    [error, setError] = useState(''),
    [creating, setCreating] = useState(false),
    [gridWidth, setGridWidth] = useState(0);
  useEffect(() => {
    if (syncToken)
      loadKeys().catch((e) => {
        if (!(e instanceof NetworkError || e instanceof AuthError)) setError(e.message);
      });
  }, [syncToken, loadKeys]);
  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  };
  const create = () =>
    run(async () => {
      setCreating(true);
      try {
        const { key } = await createKey(keyName.trim() || 'My agent', scope, {
          expires_days: expiry,
        });
        setNewKey(key);
      } finally {
        setCreating(false);
      }
    });
  const twoColumns = gridWidth >= 500;
  const agentKeys = keys.filter((k) => k.scope !== 'feed');

  return (
    <SettingsSection
      title="Agent keys"
      footer="Connect any agent or script over the REST API. Revoke a key at any time.">
      {!!error && <SettingsMessage text={error} />}
      {newKey ? (
        <View style={{ padding: space.md }}>
          <Card tone="soft" style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Ionicons name="checkmark-circle" size={22} color={c.success} />
              <Text style={{ flex: 1, fontFamily: fonts.bold, color: c.onSurface, ...type.body }}>
                Copy it now, you won&apos;t see it again
              </Text>
            </View>
            <CopyBox label="key" text={newKey} />
            <Text style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant, ...type.label }}>
              Paste this into your agent
            </Text>
            <CopyBox
              label="agent settings"
              text={`Base URL: ${url}/v1\nAuthorization: Bearer ${newKey}`}
            />
            <SettingsButton label="I saved it" primary onPress={() => setNewKey('')} />
          </Card>
        </View>
      ) : (
        <SettingsRow label="New key">
          <View style={{ gap: space.md }}>
            <SettingsInput
              accessibilityLabel="API key name"
              value={keyName}
              onChangeText={setKeyName}
            />
            <View
              accessibilityRole="radiogroup"
              onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {KEY_TYPES.map((t) => {
                const selected = t.scope === scope;
                return (
                  <PressFeedback
                    key={t.scope}
                    haptic="select"
                    accessibilityRole="radio"
                    accessibilityLabel={t.title}
                    accessibilityHint={t.description}
                    accessibilityState={{ selected, checked: selected }}
                    onPress={() => setScope(t.scope)}
                    style={{
                      width: twoColumns ? (gridWidth - space.sm) / 2 : '100%',
                      flexDirection: 'row',
                      gap: space.md,
                      padding: space.md,
                      borderRadius: radius.md,
                      borderWidth: 2,
                      borderColor: selected ? c.primary : c.outlineVariant,
                      backgroundColor: selected ? c.accentSoft : c.surfaceContainerLow,
                    }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radius.sm,
                        backgroundColor: t.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Ionicons name={t.icon} size={20} color={contrastText(t.color)} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                      <Text style={{ fontFamily: fonts.bold, color: c.onSurface, fontSize: 15 }}>
                        {t.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: fonts.regular,
                          color: c.onSurfaceVariant,
                          ...type.label,
                        }}>
                        {t.description}
                      </Text>
                    </View>
                  </PressFeedback>
                );
              })}
            </View>
            <View style={{ gap: space.sm }}>
              <Text style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant, ...type.label }}>
                Expires
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {EXPIRY.map(([label, days]) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={expiry === days}
                    onPress={() => setExpiry(days)}
                  />
                ))}
              </View>
            </View>
            <SettingsButton
              label="Create key"
              primary
              busy={creating}
              disabled={busy || creating}
              onPress={() => void create()}
            />
          </View>
        </SettingsRow>
      )}
      {agentKeys.map((k) => (
        <KeyRow key={k.id} k={k} busy={busy} onRevoke={() => void run(() => revokeKey(k.id))} />
      ))}
    </SettingsSection>
  );
}
