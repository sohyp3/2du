import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useSyncStore } from '@/store/syncStore';
import { AuthError, NetworkError } from '@/utils/http';
import { useColors, useFontFamily } from '@/utils/theme';
import { AuthForm, type AuthFormHandle } from './AuthForm';
import { PressFeedback } from './PressFeedback';
import { SettingsButton, SettingsInput, SettingsMessage } from './settings/controls';
import { BookingSettings } from './settings/BookingSettings';
import { SettingsRow } from './settings/SettingsRow';
import { SettingsSection, SPACE } from './settings/SettingsSection';

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function SyncSettings() {
  const syncUrl = useSyncStore((s) => s.url),
    syncUsername = useSyncStore((s) => s.username),
    syncToken = useSyncStore((s) => s.token),
    busy = useSyncStore((s) => s.busy),
    syncError = useSyncStore((s) => s.error),
    needsLogin = useSyncStore((s) => s.needsLogin),
    lastSync = useSyncStore((s) => s.lastSync),
    pending = useSyncStore((s) => s.pending),
    keys = useSyncStore((s) => s.keys),
    connect = useSyncStore((s) => s.connect),
    syncNow = useSyncStore((s) => s.sync),
    disconnect = useSyncStore((s) => s.disconnect),
    loadKeys = useSyncStore((s) => s.loadKeys),
    createKey = useSyncStore((s) => s.createKey),
    revokeKey = useSyncStore((s) => s.revokeKey);
  const c = useColors(),
    fonts = useFontFamily();
  const [url, setUrl] = useState(syncUrl),
    [username, setUsername] = useState(syncUsername),
    [password, setPassword] = useState('');
  const [register, setRegister] = useState(false),
    [keyName, setKeyName] = useState('My agent'),
    [scope, setScope] = useState('read'),
    [newKey, setNewKey] = useState(''),
    [error, setError] = useState('');
  // A dead session asks for the same account again, never for a new one.
  useEffect(() => {
    if (needsLogin) setRegister(false);
  }, [needsLogin]);
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
  const form = useRef<AuthFormHandle>(null);
  const signIn = () => {
    if (busy) return;
    void run(async () => {
      await connect(url, username, password, register);
      setPassword('');
    });
  };
  const message = error || syncError;
  const value = (text: string) => (
    <Text
      style={{
        fontFamily: fonts.regular,
        color: c.onSurfaceVariant,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'right',
        flexShrink: 1,
      }}>
      {text}
    </Text>
  );

  if (!syncToken)
    return (
      <AuthForm ref={form} onSubmit={signIn}>
        <SettingsSection
          title="Account"
          footer="Everything saves here first. Connect your own server to carry tasks, calendars, and thoughts between devices. Your existing local data joins this account on first sync. Registration must be enabled by the server owner.">
          {needsLogin && (
            <SettingsMessage
              notice
              text="Your session ended. Sign in again to keep syncing. Nothing on this device was lost."
            />
          )}
          <SettingsRow label="Server URL">
            <SettingsInput
              accessibilityLabel="Server URL"
              value={url}
              onChangeText={setUrl}
              placeholder="https://sync.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </SettingsRow>
          <SettingsRow label="Username">
            <SettingsInput
              accessibilityLabel="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Your username"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
            />
          </SettingsRow>
          <SettingsRow label="Password">
            <SettingsInput
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 10 characters"
              autoComplete={register ? 'new-password' : 'current-password'}
              onSubmitEditing={() => form.current?.submit()}
              secureTextEntry
            />
          </SettingsRow>
          {!!message && <SettingsMessage text={message} />}
          <View style={{ paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.xs }}>
            <SettingsButton
              primary
              label={
                busy ? 'Connecting…' : register ? 'Create account & connect' : 'Sign in & connect'
              }
              disabled={busy}
              onPress={() => form.current?.submit()}
            />
            <PressFeedback
              accessibilityRole="button"
              onPress={() => setRegister(!register)}
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 14 }}>
                {register ? 'Already have an account? Sign in' : 'First device? Create an account'}
              </Text>
            </PressFeedback>
          </View>
        </SettingsSection>
      </AuthForm>
    );

  return (
    <View>
      <SettingsSection
        title="Account"
        footer={
          Platform.OS === 'web'
            ? 'This browser stays signed in until you sign out.'
            : 'Your device session is stored securely.'
        }>
        <SettingsRow label={syncUsername} hint={hostOf(syncUrl)} />
        <SettingsRow
          destructive
          label="Sign out"
          disabled={busy}
          onPress={() => void run(disconnect)}
        />
      </SettingsSection>

      <SettingsSection
        title="Status"
        footer="Syncs every 15 seconds while open. Offline edits stay queued.">
        {!!message && <SettingsMessage text={message} />}
        <SettingsRow
          label="Last synced"
          right={value(
            busy ? 'Syncing…' : lastSync ? new Date(lastSync).toLocaleString() : 'Not yet'
          )}
        />
        <SettingsRow label="Pending changes" right={value(String(pending))} />
        <SettingsRow
          label="Sync now"
          disabled={busy}
          onPress={() => void syncNow()}
          right={busy ? <ActivityIndicator size="small" color={c.primary} /> : undefined}
        />
      </SettingsSection>

      <BookingSettings />

      <SettingsSection
        title="Agent keys"
        footer="Connect any agent over the REST API. Read-only keys can explore; read & write keys can create, edit, and delete your tasks, notes, and calendars.">
        <SettingsRow label="New key">
          <View style={{ gap: SPACE.md }}>
            <SettingsInput
              accessibilityLabel="API key name"
              value={keyName}
              onChangeText={setKeyName}
            />
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
              <SettingsButton
                grow
                label="Read only"
                selected={scope === 'read'}
                onPress={() => setScope('read')}
              />
              <SettingsButton
                grow
                label="Read & write"
                selected={scope === 'write'}
                onPress={() => setScope('write')}
              />
            </View>
            <SettingsButton
              label="Create API key"
              disabled={busy}
              onPress={() => void run(async () => setNewKey(await createKey(keyName, scope)))}
            />
          </View>
        </SettingsRow>
        {!!newKey && (
          <SettingsRow label="Copy this key now" hint="It is only shown once.">
            <View style={{ gap: SPACE.md }}>
              <Text
                selectable
                style={{
                  color: c.primary,
                  backgroundColor: c.surfaceContainerHigh,
                  fontSize: 13,
                  lineHeight: 20,
                  padding: SPACE.md,
                  borderRadius: 8,
                }}>
                {newKey}
              </Text>
              <SettingsButton label="I saved it, hide key" onPress={() => setNewKey('')} />
            </View>
          </SettingsRow>
        )}
        {keys.map((k) => (
          <SettingsRow
            key={k.id}
            label={k.name}
            hint={k.scope === 'read' ? 'Read only' : 'Read & write'}
            right={
              <SettingsButton
                label="Revoke"
                disabled={busy}
                onPress={() => void run(() => revokeKey(k.id))}
              />
            }
          />
        ))}
      </SettingsSection>
    </View>
  );
}
