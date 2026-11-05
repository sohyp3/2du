import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, Platform } from 'react-native';
import { useSyncStore } from '@/store/syncStore';
import { NetworkError } from '@/utils/http';
import { useColors, useFontFamily } from '@/utils/theme';
import { AuthForm, type AuthFormHandle } from './AuthForm';
import { PressFeedback } from './PressFeedback';
export function SyncSettings() {
  const syncUrl = useSyncStore((s) => s.url),
    syncUsername = useSyncStore((s) => s.username),
    syncToken = useSyncStore((s) => s.token),
    busy = useSyncStore((s) => s.busy),
    syncError = useSyncStore((s) => s.error),
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
  useEffect(() => {
    if (syncToken)
      loadKeys().catch((e) => {
        if (!(e instanceof NetworkError)) setError(e.message);
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
  const input = {
    color: c.onSurface,
    backgroundColor: c.surfaceContainerHigh,
    fontFamily: fonts.regular,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
  };
  const button = (label: string, fn: () => void, secondary = false) => (
    <PressFeedback
      accessibilityRole="button"
      disabled={busy}
      onPress={fn}
      style={{
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
        backgroundColor: secondary ? c.surfaceContainerHigh : c.primary,
        borderRadius: 8,
        opacity: busy ? 0.5 : 1,
      }}>
      <Text style={{ fontFamily: fonts.medium, color: secondary ? c.onSurface : c.onPrimary }}>
        {label}
      </Text>
    </PressFeedback>
  );
  return (
    <View style={{ marginBottom: 36 }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: 'PlayfairDisplay_400Regular',
          color: c.onSurface,
          fontSize: 26,
          marginBottom: 10,
        }}>
        Your devices, in sync.
      </Text>
      <Text
        style={{
          color: c.onSurfaceVariant,
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 23,
          marginBottom: 20,
        }}>
        Everything saves here first. Connect your own server to carry tasks, calendars, and thoughts
        between devices.
      </Text>
      {!syncToken ? (
        <AuthForm ref={form} onSubmit={signIn}>
          <Text style={{ color: c.onSurfaceVariant, marginBottom: 8 }}>Server URL</Text>
          <TextInput
            accessibilityLabel="Server URL"
            value={url}
            onChangeText={setUrl}
            placeholder="https://sync.example.com"
            placeholderTextColor={c.outline}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={input}
          />
          <Text style={{ color: c.onSurfaceVariant, marginBottom: 8 }}>Username</Text>
          <TextInput
            accessibilityLabel="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Your username"
            placeholderTextColor={c.outline}
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            style={input}
          />
          <Text style={{ color: c.onSurfaceVariant, marginBottom: 8 }}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 10 characters"
            placeholderTextColor={c.outline}
            autoComplete={register ? 'new-password' : 'current-password'}
            onSubmitEditing={() => form.current?.submit()}
            secureTextEntry
            style={input}
          />
          {button(
            busy ? 'Connecting…' : register ? 'Create account & connect' : 'Sign in & connect',
            () => form.current?.submit()
          )}
          <PressFeedback
            accessibilityRole="button"
            onPress={() => setRegister(!register)}
            style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text style={{ color: c.primary, fontFamily: fonts.medium }}>
              {register ? 'Already have an account? Sign in' : 'First device? Create an account'}
            </Text>
          </PressFeedback>
          <Text style={{ color: c.onSurfaceVariant, fontSize: 12, lineHeight: 20 }}>
            Your existing local data joins this account on first sync. Registration must be enabled
            by the server owner.
          </Text>
        </AuthForm>
      ) : (
        <View>
          <Text style={{ color: c.onSurface, fontFamily: fonts.medium, marginBottom: 6 }}>
            {syncUsername} · {syncUrl}
          </Text>
          <Text style={{ color: c.onSurfaceVariant, fontSize: 13, marginBottom: 16 }}>
            {busy
              ? 'Syncing…'
              : lastSync
                ? `Last synced ${new Date(lastSync).toLocaleString()}`
                : 'Ready to sync'}
            {pending ? ` · ${pending} pending` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {button('Sync now', () => syncNow())}
            {button('Disconnect', () => run(disconnect), true)}
          </View>
          <Text style={{ color: c.onSurfaceVariant, fontSize: 12, lineHeight: 20, marginTop: 12 }}>
            Syncs every 15 seconds while open. Offline edits stay queued.{' '}
            {Platform.OS === 'web'
              ? 'This browser stays signed in for 30 days, or until you disconnect.'
              : 'Your device session is stored securely.'}
          </Text>
          <Text
            accessibilityRole="header"
            style={{
              color: c.onSurface,
              fontFamily: 'PlayfairDisplay_400Regular',
              fontSize: 26,
              marginTop: 36,
              marginBottom: 10,
            }}>
            A key for your agent.
          </Text>
          <Text
            style={{ color: c.onSurfaceVariant, fontSize: 14, lineHeight: 23, marginBottom: 20 }}>
            Connect any agent over the REST API. Read-only keys can explore; read & write keys can
            create, edit, and delete your tasks, notes, and calendars.
          </Text>
          <TextInput
            accessibilityLabel="API key name"
            value={keyName}
            onChangeText={setKeyName}
            style={input}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {button(
              scope === 'read' ? 'Read only · selected' : 'Read only',
              () => setScope('read'),
              scope !== 'read'
            )}
            {button(
              scope === 'write' ? 'Read & write · selected' : 'Read & write',
              () => setScope('write'),
              scope !== 'write'
            )}
          </View>
          {button('Create API key', () =>
            run(async () => setNewKey(await createKey(keyName, scope)))
          )}
          {!!newKey && (
            <View
              style={{
                backgroundColor: c.primaryContainer,
                padding: 16,
                borderRadius: 8,
                marginTop: 16,
              }}>
              <Text style={{ color: c.onSurface, marginBottom: 10 }}>
                Copy this key now. It is only shown once.
              </Text>
              <Text selectable style={{ color: c.primary, fontSize: 13, lineHeight: 22 }}>
                {newKey}
              </Text>
              <PressFeedback
                onPress={() => setNewKey('')}
                accessibilityRole="button"
                style={{ paddingTop: 16, minHeight: 44 }}>
                <Text style={{ color: c.onSurface }}>I saved it — hide key</Text>
              </PressFeedback>
            </View>
          )}
          {keys.map((k) => (
            <View
              key={k.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: c.outlineVariant,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.onSurface, fontFamily: fonts.medium }}>{k.name}</Text>
                <Text style={{ color: c.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                  {k.scope === 'read' ? 'Read only' : 'Read & write'}
                </Text>
              </View>
              {button('Revoke', () => run(() => revokeKey(k.id)), true)}
            </View>
          ))}
        </View>
      )}
      {!!(error || syncError) && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.error, fontFamily: fonts.regular, lineHeight: 22, marginTop: 16 }}>
          {error || syncError}
        </Text>
      )}
    </View>
  );
}
