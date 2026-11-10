import { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useColors } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { SettingsButton, SettingsInput, SettingsMessage } from './settings/controls';
import { SettingsRow } from './settings/SettingsRow';
import { SettingsSection, SPACE } from './settings/SettingsSection';

const colors = ['#a7c968', '#bb8ed6', '#eccb73', '#8bcdec', '#eeaba0', '#d9945c'];
/** `editing` value for the "Add calendar" row; real calendars use their id. */
const NEW = '';

export function CalendarSettings() {
  const calendars = useCalendarsStore((s) => s.calendars),
    save = useCalendarsStore((s) => s.save),
    remove = useCalendarsStore((s) => s.remove);
  const [name, setName] = useState(''),
    [color, setColor] = useState(colors[0]),
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
    <View style={{ gap: SPACE.md }}>
      <SettingsInput
        accessibilityLabel="Calendar name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        placeholder="e.g. Side projects"
        maxLength={100}
        autoFocus
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {colors.map((v) => (
          <PressFeedback
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Calendar color ${v}`}
            accessibilityState={{ selected: color === v }}
            onPress={() => setColor(v)}
            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: v,
                borderWidth: color === v ? 3 : 0,
                borderColor: c.onSurface,
              }}
            />
          </PressFeedback>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
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
          onPress={() => open(NEW, '', colors[0])}
          right={<Ionicons name="add" size={20} color={c.primary} />}
        />
      )}
      {!!error && <SettingsMessage text={error} />}
    </SettingsSection>
  );
}
