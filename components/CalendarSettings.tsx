import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
const colors = ['#a7c968', '#bb8ed6', '#eccb73', '#8bcdec', '#eeaba0', '#d9945c'];
export function CalendarSettings() {
  const calendars = useCalendarsStore((s) => s.calendars),
    save = useCalendarsStore((s) => s.save),
    remove = useCalendarsStore((s) => s.remove);
  const [name, setName] = useState(''),
    [color, setColor] = useState(colors[0]),
    [editing, setEditing] = useState<string | undefined>(),
    [error, setError] = useState('');
  const c = useColors(),
    fonts = useFontFamily();
  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save calendar');
    }
  };
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
        Different parts of your life.
      </Text>
      <Text style={{ color: c.onSurfaceVariant, fontSize: 14, lineHeight: 23, marginBottom: 16 }}>
        Give daily tasks, work, and everything else their own calendar. Select one when adding or
        editing a task.
      </Text>
      {calendars.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.outlineVariant,
          }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel={`Edit calendar ${item.name}`}
            onPress={() => {
              setEditing(item.id);
              setName(item.name);
              setColor(item.color);
            }}
            style={{ flex: 1, minHeight: 56, justifyContent: 'center' }}>
            <Text style={{ color: c.onSurface, fontFamily: fonts.medium }}>{item.name}</Text>
          </PressFeedback>
          <PressFeedback
            accessibilityRole="button"
            accessibilityLabel={`Delete calendar ${item.name}`}
            onPress={() => run(() => remove(item.id))}
            style={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={18} color={c.onSurfaceVariant} />
          </PressFeedback>
        </View>
      ))}
      <Text style={{ color: c.onSurfaceVariant, marginTop: 20, marginBottom: 8 }}>
        {editing ? 'Edit calendar' : 'New calendar'}
      </Text>
      <TextInput
        accessibilityLabel="Calendar name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Side projects"
        placeholderTextColor={c.outline}
        maxLength={100}
        style={{
          backgroundColor: c.surfaceContainerHigh,
          color: c.onSurface,
          fontFamily: fonts.regular,
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: 8,
          fontSize: 16,
        }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12 }}>
        {colors.map((v) => (
          <PressFeedback
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Calendar color ${v}`}
            accessibilityState={{ selected: color === v }}
            onPress={() => setColor(v)}
            style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: v,
                borderWidth: color === v ? 3 : 0,
                borderColor: c.onSurface,
              }}
            />
          </PressFeedback>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <PressFeedback
          accessibilityRole="button"
          disabled={!name.trim()}
          onPress={() =>
            run(async () => {
              await save(name, color, editing);
              setName('');
              setEditing(undefined);
            })
          }
          style={{
            backgroundColor: c.primary,
            minHeight: 48,
            paddingHorizontal: 20,
            borderRadius: 8,
            justifyContent: 'center',
            opacity: name.trim() ? 1 : 0.5,
          }}>
          <Text style={{ color: c.onPrimary, fontFamily: fonts.medium }}>
            {editing ? 'Save calendar' : 'Add calendar'}
          </Text>
        </PressFeedback>
        {editing && (
          <PressFeedback
            onPress={() => {
              setEditing(undefined);
              setName('');
            }}
            style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ color: c.onSurface }}>Cancel</Text>
          </PressFeedback>
        )}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: c.error, marginTop: 12 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
