import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGoalCategoriesStore } from '@/store/goalCategoriesStore';
import { SWATCHES } from '@/utils/palette';
import { space, useColors, useFontFamily } from '@/utils/theme';
import { Chip, ColorChip } from './Chip';
import { SettingsButton, SettingsInput } from './settings/controls';

/** Pick a goal category, or make a new one inline. `null` is no category. */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const categories = useGoalCategoriesStore((s) => s.categories);
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(''),
    [color, setColor] = useState<string>(SWATCHES[0]),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);

  const open = () => {
    setAdding(true);
    setName('');
    setError('');
    setColor(SWATCHES[categories.length % SWATCHES.length]);
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      await useGoalCategoriesStore.getState().save(name, color, id);
      onChange(id);
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label="None" selected={value == null} onPress={() => onChange(null)} />
        {categories.map((cat) => (
          <ColorChip
            key={cat.id}
            label={cat.name}
            color={cat.color}
            selected={value === cat.id}
            icon={value === cat.id ? 'checkmark' : undefined}
            onPress={() => onChange(cat.id)}
          />
        ))}
        {!adding && (
          <Chip
            label="New"
            accessibilityLabel="New category"
            selected={false}
            leading={<Ionicons name="add" size={16} color={c.onSurface} />}
            onPress={open}
          />
        )}
      </View>
      {adding && (
        <View style={{ gap: space.md }}>
          <SettingsInput
            accessibilityLabel="Category name"
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => void submit()}
            placeholder="e.g. Health"
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
                accessibilityLabel={`Category color ${v}`}
                onPress={() => setColor(v)}
              />
            ))}
          </View>
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{ color: c.error, fontFamily: fonts.regular, fontSize: 13 }}>
              {error}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <SettingsButton
              primary
              label="Add category"
              disabled={!name.trim()}
              busy={saving}
              onPress={() => void submit()}
            />
            <SettingsButton label="Cancel" onPress={() => setAdding(false)} />
          </View>
        </View>
      )}
    </View>
  );
}
