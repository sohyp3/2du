import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthForm, type AuthFormHandle } from '@/components/AuthForm';
import { Card } from '@/components/Card';
import { Segmented } from '@/components/Chip';
import { PressFeedback } from '@/components/PressFeedback';
import { SyncChip } from '@/components/SyncChip';
import { friendlyAuthError } from '@/shared/authError';
import { BindingConflict, DEFAULT_SERVER, type ConnectMode, useSyncStore } from '@/store/syncStore';
import { NetworkError } from '@/utils/http';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsMessage } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function errorText(e: unknown) {
  if (!(e instanceof Error)) return 'Request failed';
  const status = (e as { status?: number }).status;
  return friendlyAuthError({ message: e.message, status, network: e instanceof NetworkError });
}

/** A plain accent-coloured text button, for secondary actions inside a form. */
function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <PressFeedback
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: c.primary, fontFamily: fonts.bold, ...type.label }}>{label}</Text>
    </PressFeedback>
  );
}

/** An inline confirm: a title, a line of context, and the choices stacked below. */
function Confirm({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <Card tone="soft" style={{ gap: space.md, backgroundColor: c.accentSoft }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fonts.bold, color: c.onSurface, ...type.body }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.label }}>
        {body}
      </Text>
      <View style={{ gap: space.sm }}>{children}</View>
    </Card>
  );
}

function Chevron({ open }: { open: boolean }) {
  const c = useColors();
  return (
    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.onSurfaceVariant} />
  );
}

function SignedOut() {
  const syncUrl = useSyncStore((s) => s.url),
    syncUsername = useSyncStore((s) => s.username),
    busy = useSyncStore((s) => s.busy),
    needsLogin = useSyncStore((s) => s.needsLogin),
    connect = useSyncStore((s) => s.connect);
  const c = useColors(),
    fonts = useFontFamily();
  const [url, setUrl] = useState(syncUrl || DEFAULT_SERVER),
    [username, setUsername] = useState(syncUsername),
    [password, setPassword] = useState(''),
    [mode, setMode] = useState<'signin' | 'register'>('signin'),
    [advanced, setAdvanced] = useState(!!syncUrl && syncUrl !== DEFAULT_SERVER),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState('');
  const register = mode === 'register';
  // The store loads its saved server and username after the first render.
  useEffect(() => {
    if (!syncUrl) return;
    setUrl(syncUrl);
    if (syncUrl !== DEFAULT_SERVER) setAdvanced(true);
  }, [syncUrl]);
  useEffect(() => {
    if (syncUsername) setUsername((u) => u || syncUsername);
  }, [syncUsername]);
  // A dead session asks for the same account again, never for a new one.
  useEffect(() => {
    if (needsLogin) setMode('signin');
  }, [needsLogin]);
  const form = useRef<AuthFormHandle>(null);

  const submit = async (choice?: ConnectMode) => {
    if (busy) return;
    setError('');
    try {
      await connect(url, username, password, register, choice);
      setPassword('');
      setConflict(false);
    } catch (e) {
      if (e instanceof BindingConflict) return setConflict(true);
      setConflict(false);
      setError(errorText(e));
    }
  };
  const label = busy
    ? register
      ? 'Creating account…'
      : 'Signing in…'
    : register
      ? 'Create account'
      : 'Sign in';

  return (
    <AuthForm ref={form} onSubmit={() => void submit()}>
      <Card style={{ gap: space.lg, marginBottom: space.xl }}>
        <View style={{ gap: space.xs }}>
          <Text style={{ fontSize: 40, lineHeight: 48 }}>👋</Text>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: DISPLAY_FONT, color: c.onSurface, ...type.title, fontSize: 24 }}>
            Sync across your devices
          </Text>
          <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.label }}>
            Everything saves on this device first. Sign in to carry your tasks, calendars and notes
            everywhere.
          </Text>
        </View>
        {needsLogin && (
          <SettingsMessage
            notice
            text="Your session ended. Sign in again to keep syncing. Nothing on this device was lost."
          />
        )}
        <Segmented
          grow
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'register', label: 'Create account' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError('');
          }}
        />
        <View style={{ gap: space.md }}>
          <SettingsInput
            accessibilityLabel="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
          />
          <SettingsInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={register ? 'At least 10 characters' : 'Password'}
            autoComplete={register ? 'new-password' : 'current-password'}
            onSubmitEditing={() => form.current?.submit()}
            secureTextEntry
          />
        </View>
        {!!error && <SettingsMessage text={error} />}
        {conflict ? (
          <Confirm
            title="This device already has data"
            body="It came from another account or server. Choose what happens to it.">
            <SettingsButton
              primary
              label={`Merge into ${username.trim()}`}
              busy={busy}
              onPress={() => void submit('merge')}
            />
            <SettingsButton
              label="Start fresh"
              disabled={busy}
              onPress={() => void submit('fresh')}
            />
            <TextButton label="Cancel" onPress={() => setConflict(false)} />
            <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.caption }}>
              Merge moves this device's data into {username.trim() || 'the account'}. Start fresh
              removes it from this device and loads the account's data.
            </Text>
          </Confirm>
        ) : (
          <SettingsButton
            primary
            label={label}
            busy={busy}
            disabled={!username.trim() || !password}
            onPress={() => form.current?.submit()}
          />
        )}
      </Card>
      <SettingsSection title="Advanced">
        <SettingsRow
          label="Use a different server"
          hint={advanced ? undefined : hostOf(url)}
          onPress={() => setAdvanced(!advanced)}
          right={<Chevron open={advanced} />}
        />
        {advanced && (
          <View style={{ padding: space.lg, paddingTop: space.sm, gap: space.xs }}>
            <SettingsInput
              accessibilityLabel="Server URL"
              value={url}
              onChangeText={setUrl}
              placeholder={DEFAULT_SERVER}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextButton
              label={`Reset to ${hostOf(DEFAULT_SERVER)}`}
              onPress={() => setUrl(DEFAULT_SERVER)}
            />
          </View>
        )}
      </SettingsSection>
    </AuthForm>
  );
}

function ChangePassword() {
  const changePassword = useSyncStore((s) => s.changePassword);
  const [open, setOpen] = useState(false),
    [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState(''),
    [working, setWorking] = useState(false),
    [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);
  const save = async () => {
    if (next.length < 10) return setMessage({ text: 'Use at least 10 characters.' });
    if (next !== confirm) return setMessage({ text: "The new passwords don't match." });
    setWorking(true);
    setMessage(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setOpen(false);
      setMessage({ text: 'Password changed. Other devices need to sign in again.', ok: true });
    } catch (e) {
      setMessage({ text: errorText(e) });
    } finally {
      setWorking(false);
    }
  };
  return (
    <View>
      <SettingsRow
        icon="lock-closed"
        label="Change password"
        onPress={() => {
          setOpen(!open);
          setMessage(null);
        }}
        right={<Chevron open={open} />}
      />
      {!!message && <SettingsMessage text={message.text} tone={message.ok ? 'success' : 'error'} />}
      {open && (
        <View style={{ padding: space.lg, paddingTop: space.sm, gap: space.md }}>
          <SettingsInput
            accessibilityLabel="Current password"
            placeholder="Current password"
            value={current}
            onChangeText={setCurrent}
            autoComplete="current-password"
            secureTextEntry
          />
          <SettingsInput
            accessibilityLabel="New password"
            placeholder="New password, at least 10 characters"
            value={next}
            onChangeText={setNext}
            autoComplete="new-password"
            secureTextEntry
          />
          <SettingsInput
            accessibilityLabel="Confirm new password"
            placeholder="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            onSubmitEditing={() => void save()}
            secureTextEntry
          />
          <SettingsButton
            primary
            label="Change password"
            busy={working}
            disabled={!current || !next || !confirm}
            onPress={() => void save()}
          />
        </View>
      )}
    </View>
  );
}

function SignedIn() {
  const syncUrl = useSyncStore((s) => s.url),
    username = useSyncStore((s) => s.username),
    busy = useSyncStore((s) => s.busy),
    syncError = useSyncStore((s) => s.error),
    syncNow = useSyncStore((s) => s.sync),
    disconnect = useSyncStore((s) => s.disconnect),
    deleteAccount = useSyncStore((s) => s.deleteAccount);
  const c = useColors(),
    fonts = useFontFamily();
  const [confirm, setConfirm] = useState<'signout' | 'delete' | null>(null),
    [password, setPassword] = useState(''),
    [working, setWorking] = useState(false),
    [error, setError] = useState('');
  const run = async (fn: () => Promise<unknown>) => {
    setError('');
    setWorking(true);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setWorking(false);
    }
  };
  const message = error || syncError;

  return (
    <View>
      <Card style={{ marginBottom: space.xl, gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ fontFamily: DISPLAY_FONT, color: c.onPrimary, fontSize: 26 }}>
              {(username[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: DISPLAY_FONT, color: c.onSurface, ...type.title }}>
              {username}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, ...type.label }}>
              {hostOf(syncUrl)}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: space.sm,
          }}>
          <SyncChip />
          <SettingsButton label="Sync now" busy={busy} onPress={() => void syncNow()} />
        </View>
      </Card>
      {!!message && <SettingsMessage text={message} />}

      <SettingsSection
        title="Account"
        footer={
          Platform.OS === 'web'
            ? 'This browser stays signed in until you sign out. Syncs every 15 seconds while open.'
            : 'Your device session is stored securely. Syncs every 15 seconds while open.'
        }>
        <ChangePassword />
        <View>
          <SettingsRow
            icon="log-out"
            iconColor={c.outline}
            label="Sign out"
            disabled={working}
            onPress={() => setConfirm(confirm === 'signout' ? null : 'signout')}
          />
          {confirm === 'signout' && (
            <View style={{ padding: space.md, paddingTop: 0 }}>
              <Confirm
                title="Sign out of this device?"
                body="Keep your data here to use it offline, or remove it so the next person starts clean.">
                <SettingsButton
                  primary
                  label="Keep data on this device"
                  busy={working}
                  onPress={() => void run(() => disconnect(true))}
                />
                <SettingsButton
                  destructive
                  label="Remove local data"
                  disabled={working}
                  onPress={() => void run(() => disconnect(false))}
                />
                <TextButton label="Cancel" onPress={() => setConfirm(null)} />
              </Confirm>
            </View>
          )}
        </View>
        <View>
          <SettingsRow
            icon="trash"
            iconColor={c.error}
            destructive
            label="Delete account"
            disabled={working}
            onPress={() => {
              setConfirm(confirm === 'delete' ? null : 'delete');
              setPassword('');
            }}
          />
          {confirm === 'delete' && (
            <View style={{ padding: space.md, paddingTop: 0 }}>
              <Confirm
                title="Delete your account?"
                body="This permanently deletes your account and synced data on the server.">
                <SettingsInput
                  accessibilityLabel="Password"
                  placeholder="Your password"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="current-password"
                  secureTextEntry
                />
                <SettingsButton
                  destructive
                  label="Delete account"
                  busy={working}
                  disabled={!password}
                  onPress={() => void run(() => deleteAccount(password))}
                />
                <TextButton label="Cancel" onPress={() => setConfirm(null)} />
              </Confirm>
            </View>
          )}
        </View>
      </SettingsSection>
    </View>
  );
}

export function AccountSettings() {
  const token = useSyncStore((s) => s.token);
  return token ? <SignedIn /> : <SignedOut />;
}
