import { useState } from 'react';
import { Alert, Platform, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGoalStore } from '@/store/goalStore';
import type { Goal, GoalStatus } from '@/db/goals';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

const STATUSES: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Done' },
];

const IMPORTANCE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function GoalEditor({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const c = useColors(),
    fonts = useFontFamily();
  const [name, setName] = useState(goal?.name ?? '');
  const [importance, setImportance] = useState(goal?.importance ?? 5);
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(goal?.weekly_target ?? null);
  const [notes, setNotes] = useState(goal?.description ?? '');
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const label = (text: string) => (
    <Text
      style={{
        fontFamily: fonts.medium,
        fontSize: 13,
        color: c.onSurfaceVariant,
        marginBottom: 8,
        marginTop: 16,
      }}>
      {text}
    </Text>
  );

  const save = async () => {
    if (!name.trim()) {
      setError('Give the goal a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await useGoalStore.getState().save({
        id: goal?.id,
        name: name.trim(),
        description: notes,
        importance,
        weekly_target: weeklyTarget,
        status: goal ? status : 'active',
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the goal.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!goal) return;
    try {
      await useGoalStore.getState().remove(goal.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the goal.');
    }
  };

  const confirmDelete = () => {
    const message = 'Its tasks are kept, but they will no longer belong to this goal.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete this goal? ${message}`)) void doDelete();
      return;
    }
    Alert.alert('Delete goal', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  return (
    <View
      style={{
        backgroundColor: c.surfaceContainer,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 18, color: c.onSurface }}>
        {goal ? 'Edit goal' : 'New goal'}
      </Text>

      {label('Name')}
      <TextInput
        style={{
          fontFamily: fonts.regular,
          backgroundColor: c.surface,
          color: c.onSurface,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
        }}
        placeholderTextColor={c.outline}
        placeholder="Learn Russian"
        value={name}
        onChangeText={setName}
        autoFocus={!goal}
      />

      {label('Importance')}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {IMPORTANCE.map((n) => {
          const chosen = n === importance;
          return (
            <PressFeedback
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`Importance ${n}`}
              accessibilityState={{ selected: chosen }}
              hitSlop={4}
              onPress={() => setImportance(n)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: chosen ? c.primary : c.surfaceContainerHigh,
              }}>
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  color: chosen ? c.onPrimary : c.onSurfaceVariant,
                }}>
                {n}
              </Text>
            </PressFeedback>
          );
        })}
      </View>

      {label('Tasks to complete each week')}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StepButton
          icon="remove"
          label="Fewer tasks each week"
          disabled={weeklyTarget == null}
          onPress={() => setWeeklyTarget((t) => (t == null || t <= 1 ? null : t - 1))}
        />
        <Text
          style={{
            minWidth: 80,
            textAlign: 'center',
            fontFamily: fonts.medium,
            fontSize: 16,
            color: c.onSurface,
          }}>
          {weeklyTarget == null ? 'None' : weeklyTarget}
        </Text>
        <StepButton
          icon="add"
          label="More tasks each week"
          disabled={weeklyTarget === 14}
          onPress={() => setWeeklyTarget((t) => (t == null ? 1 : Math.min(14, t + 1)))}
        />
      </View>

      {label('Notes')}
      <TextInput
        style={{
          fontFamily: fonts.regular,
          backgroundColor: c.surface,
          color: c.onSurface,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: 80,
        }}
        placeholderTextColor={c.outline}
        placeholder="Why it matters, or what done looks like"
        value={notes}
        onChangeText={setNotes}
        multiline
        textAlignVertical="top"
      />

      {goal && (
        <>
          {label('Status')}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STATUSES.map((s) => {
              const chosen = s.value === status;
              return (
                <PressFeedback
                  key={s.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chosen }}
                  onPress={() => setStatus(s.value)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    justifyContent: 'center',
                    backgroundColor: chosen ? c.surfaceContainerHighest : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 13,
                      color: chosen ? c.onSurface : c.onSurfaceVariant,
                    }}>
                    {s.label}
                  </Text>
                </PressFeedback>
              );
            })}
          </View>
        </>
      )}

      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.error, fontFamily: fonts.regular, fontSize: 13, marginTop: 12 }}>
          {error}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}>
        {goal ? (
          <PressFeedback
            accessibilityRole="button"
            onPress={confirmDelete}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.error }}>Delete</Text>
          </PressFeedback>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PressFeedback
            accessibilityRole="button"
            onPress={onClose}
            style={{
              minHeight: 44,
              paddingHorizontal: 16,
              borderRadius: 12,
              justifyContent: 'center',
              backgroundColor: c.surfaceContainerHigh,
            }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.onSurface }}>
              Cancel
            </Text>
          </PressFeedback>
          <PressFeedback
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void save()}
            style={{
              minHeight: 44,
              paddingHorizontal: 20,
              borderRadius: 12,
              justifyContent: 'center',
              backgroundColor: c.primary,
              opacity: saving ? 0.6 : 1,
            }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.onPrimary }}>Save</Text>
          </PressFeedback>
        </View>
      </View>
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceContainerHigh,
        opacity: disabled ? 0.4 : 1,
      }}>
      <Ionicons name={icon} size={20} color={c.onSurface} />
    </PressFeedback>
  );
}
