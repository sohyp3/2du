import { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendarsStore } from '@/store/calendarsStore';
import { SWATCHES } from '@/utils/palette';
import { space, useColors } from '@/utils/theme';
import { ColorChip } from './Chip';
import { PressFeedback } from './PressFeedback';
import { SettingsButton, SettingsInput, SettingsMessage } from './settings/controls';
import { SettingsRow } from './settings/SettingsRow';
import { SettingsSection } from './settings/SettingsSection';

/** `editing` value for the "Add calendar" row; real calendars use their id. */
const NEW = '';

export function CalendarSettings() {
  const calendars = useCalendarsStore((s) => s.calendars),
    save = useCalendarsStore((s) => s.save),
    remove = useCalendarsStore((s) => s.remove);
  const [name, setName] = useState(''),
    [color, setColor] = useState<string>(SWATCHES[0]),
    [editing, setEditing] = useState<string | undefined>(),
    [error, setError] = useState('');
  const c = useColors();
  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save calendar');
    }
  };
  const open = (id: string, initialName: string, initialColor: string) => {
    setError('');
    setEditing(id);
    setName(initialName);
    setColor(initialColor);
  };
  const close = () => {
    setEditing(undefined);
    setName('');
  };
  const submit = () => {
    if (!name.trim()) return;
    void run(async () => {
      await save(name, color, editing || undefined);
      close();
    });
  };
  const iconButton = (
    label: string,
    icon: 'pencil-outline' | 'trash-outline',
    onPress: () => void
  ) => (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={c.onSurfaceVariant} />
    </PressFeedback>
  );
  const square = (value: string) => (
    <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: value }} />
  );
  const editor = (
    <View style={{ gap: space.md }}>
      <SettingsInput
        accessibilityLabel="Calendar name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="e.g. Side projects"
        maxLength={100}
        autoFocus
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {SWATCHES.map((v) => (
          <ColorChip
            key={v}
            color={v}
            selected={color === v}
            icon={color === v ? 'checkmark' : undefined}
            accessibilityLabel={`Calendar color ${v}`}
            onPress={() => setColor(v)}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <SettingsButton
          primary
          label={editing ? 'Save calendar' : 'Add calendar'}
          disabled={!name.trim()}
          onPress={submit}
        />
        <SettingsButton label="Cancel" onPress={close} />
      </View>
    </View>
  );
  return (
    <SettingsSection
      title="Calendars"
      footer="Give daily tasks, work, and everything else their own calendar. Select one when adding or editing a task.">
      {calendars.map((item) =>
        editing === item.id ? (
          <SettingsRow key={item.id} label="Edit calendar" left={square(color)}>
            {editor}
          </SettingsRow>
        ) : (
          <SettingsRow
            key={item.id}
            label={item.name}
            left={square(item.color)}
            right={
              <View style={{ flexDirection: 'row' }}>
                {iconButton(`Edit calendar ${item.name}`, 'pencil-outline', () =>
                  open(item.id, item.name, item.color)
                )}
                {iconButton(`Delete calendar ${item.name}`, 'trash-outline', () =>
                  run(() => remove(item.id))
                )}
              </View>
            }
          />
        )
      )}
      {editing === NEW ? (
        <SettingsRow label="New calendar" left={square(color)}>
          {editor}
        </SettingsRow>
      ) : (
        <SettingsRow
          label="Add calendar"
          onPress={() => open(NEW, '', SWATCHES[0])}
          right={<Ionicons name="add" size={20} color={c.primary} />}
        />
      )}
      {!!error && <SettingsMessage text={error} />}
    </SettingsSection>
  );
}
