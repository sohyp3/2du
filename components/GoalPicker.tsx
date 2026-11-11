import { ScrollView } from 'react-native';
import { useGoalStore } from '@/store/goalStore';
import { space } from '@/utils/theme';
import { Chip } from './Chip';

// A row of goal chips. Renders nothing when there are no goals, so users without goals
// never see the field.
export function GoalPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const goals = useGoalStore((s) => s.goals);
  if (!goals.length) return null;

  // Active goals, plus the current one even when it is paused or done.
  const shown = goals.filter((g) => g.status === 'active' || g.id === value);
  const options = [{ id: null as string | null, name: 'No goal' }, ...shown];

  return (
    <ScrollView
      style={{ flexGrow: 0, flexShrink: 0 }}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: space.xs, paddingVertical: space.xs, alignItems: 'center' }}>
      {options.map((item) => (
        <Chip
          key={item.id ?? 'none'}
          label={item.name}
          selected={item.id === value}
          onPress={() => onChange(item.id)}
        />
      ))}
    </ScrollView>
  );
}
