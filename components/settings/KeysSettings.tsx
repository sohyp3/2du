import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSyncStore } from '@/store/syncStore';
import { AuthError, NetworkError } from '@/utils/http';
import { space, useColors } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsMessage } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

export function KeysSettings() {
  const syncToken = useSyncStore((s) => s.token),
    busy = useSyncStore((s) => s.busy),
    keys = useSyncStore((s) => s.keys),
    loadKeys = useSyncStore((s) => s.loadKeys),
    createKey = useSyncStore((s) => s.createKey),
    revokeKey = useSyncStore((s) => s.revokeKey);
  const c = useColors();
  const [keyName, setKeyName] = useState('My agent'),
    [scope, setScope] = useState('read'),
    [newKey, setNewKey] = useState(''),
    [error, setError] = useState('');
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

  return (
    <SettingsSection
      title="Agent keys"
      footer="Connect any agent over the REST API. Read-only keys can explore; read & write keys can create, edit, and delete your tasks, notes, and calendars.">
      {!!error && <SettingsMessage text={error} />}
      <SettingsRow label="New key">
        <View style={{ gap: space.md }}>
          <SettingsInput
            accessibilityLabel="API key name"
            value={keyName}
            onChangeText={setKeyName}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
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
          <View style={{ gap: space.md }}>
            <Text
              selectable
              style={{
                color: c.primary,
                backgroundColor: c.surfaceContainerHigh,
                fontSize: 13,
                lineHeight: 20,
                padding: space.md,
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
  );
}
