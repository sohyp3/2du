import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ColorChip } from '@/components/Chip';
import { useGoalCategoriesStore } from '@/store/goalCategoriesStore';
import { useGoalStore } from '@/store/goalStore';
import { SWATCHES } from '@/utils/palette';
import { space, useColors, useFontFamily } from '@/utils/theme';
import { SettingsButton, SettingsInput, SettingsMessage } from './controls';
import { SettingsRow } from './SettingsRow';
import { SettingsSection } from './SettingsSection';

/** `editing` value for the "Add category" row; real categories use their id. */
const NEW = '';

/** Goal categories: add, rename, recolour and delete. Local data, so it works signed out. */
export function GoalsSettings() {
  const categories = useGoalCategoriesStore((s) => s.categories),
    save = useGoalCategoriesStore((s) => s.save),
    remove = useGoalCategoriesStore((s) => s.remove);
  const goals = useGoalStore((s) => s.goals);
  const [editing, setEditing] = useState<string | undefined>(),
    [confirming, setConfirming] = useState(false),
    [name, setName] = useState(''),
    [color, setColor] = useState<string>(SWATCHES[0]),
    [error, setError] = useState('');
  const c = useColors(),
    fonts = useFontFamily();

  const counts = useMemo(() => {
    const by = new Map<string, number>();
    for (const g of goals)
      if (g.category_id) by.set(g.category_id, (by.get(g.category_id) ?? 0) + 1);
    return by;
  }, [goals]);

  const run = async (fn: () => Promise<void>) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the category.');
    }
  };
  const open = (id: string, initialName: string, initialColor: string) => {
    setError('');
    setConfirming(false);
    setEditing(id);
    setName(initialName);
    setColor(initialColor);
  };
  const close = () => {
    setEditing(undefined);
    setConfirming(false);
    setName('');
  };
  const submit = () => {
    if (!name.trim()) return;
    void run(async () => {
      await save(name, color, editing || undefined);
      close();
    });
  };
  const doDelete = (id: string) =>
    void run(async () => {
      await remove(id);
      close();
    });

  const dot = (value: string) => (
    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: value }} />
  );
  const countLabel = (n: number) => (n === 1 ? '1 goal' : `${n} goals`);

  const editor = (id: string) => (
    <View style={{ gap: space.md }}>
      <SettingsInput
        accessibilityLabel="Category name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
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
      {confirming ? (
        <View style={{ gap: space.sm }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.onSurface }}>
            Delete this category? Goals in it become uncategorized.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <SettingsButton destructive label="Delete category" onPress={() => doDelete(id)} />
            <SettingsButton label="Keep it" onPress={() => setConfirming(false)} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <SettingsButton
            primary
            label={id ? 'Save category' : 'Add category'}
            disabled={!name.trim()}
            onPress={submit}
          />
          <SettingsButton label="Cancel" onPress={close} />
          {!!id && (
            <SettingsButton destructive label="Delete" onPress={() => setConfirming(true)} />
          )}
        </View>
      )}
    </View>
  );

  return (
    <SettingsSection
      title="Categories"
      footer="Group goals into coloured categories. Pick one when adding or editing a goal.">
      {categories.map((cat) =>
        editing === cat.id ? (
          <SettingsRow key={cat.id} label="Edit category" left={dot(color)}>
            {editor(cat.id)}
          </SettingsRow>
        ) : (
          <SettingsRow
            key={cat.id}
            label={cat.name}
            hint={countLabel(counts.get(cat.id) ?? 0)}
            left={dot(cat.color)}
            onPress={() => open(cat.id, cat.name, cat.color)}
            right={<Ionicons name="pencil-outline" size={18} color={c.onSurfaceVariant} />}
          />
        )
      )}
      {editing === NEW ? (
        <SettingsRow label="New category" left={dot(color)}>
          {editor(NEW)}
        </SettingsRow>
      ) : (
        <SettingsRow
          label="Add category"
          onPress={() => open(NEW, '', SWATCHES[categories.length % SWATCHES.length])}
          right={<Ionicons name="add" size={20} color={c.primary} />}
        />
      )}
      {!!error && <SettingsMessage text={error} />}
    </SettingsSection>
  );
}
