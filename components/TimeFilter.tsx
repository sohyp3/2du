import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTodoStore } from '@/store/todoStore';
import { getFilterLabel, type FilterPeriod } from '@/utils/dates';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { ScreenHeader } from './ScreenHeader';
import { Segmented } from './Chip';

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: FilterPeriod; label: string }[];
const CURRENT = new Set(['Today', 'This Week', 'This Month']);
const STATUS_LABEL = { all: 'All', active: 'Active', completed: 'Done' } as const;

/** Tasks header: the period as the title, progress as the subtitle, then period + status. */
export function TimeFilter({ subtitle }: { subtitle?: string }) {
  const period = useTodoStore((s) => s.period),
    referenceDate = useTodoStore((s) => s.referenceDate),
    statusFilter = useTodoStore((s) => s.statusFilter),
    setPeriod = useTodoStore((s) => s.setPeriod),
    setStatusFilter = useTodoStore((s) => s.setStatusFilter),
    navigatePeriod = useTodoStore((s) => s.navigatePeriod),
    goToToday = useTodoStore((s) => s.goToToday);
  const c = useColors(),
    fonts = useFontFamily();
  const label = getFilterLabel(period, referenceDate);
  const iconButton = (dir: 'prev' | 'next') => (
    <PressFeedback
      key={dir}
      accessibilityRole="button"
      accessibilityLabel={dir === 'prev' ? 'Previous period' : 'Next period'}
      onPress={() => navigatePeriod(dir)}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons
        name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={c.onSurfaceVariant}
      />
    </PressFeedback>
  );
  return (
    <View>
      <ScreenHeader
        title={label}
        subtitle={subtitle}
        actions={
          <>
            {!CURRENT.has(label) && (
              <PressFeedback
                accessibilityRole="button"
                onPress={goToToday}
                style={{ minHeight: 40, paddingHorizontal: space.sm, justifyContent: 'center' }}>
                <Text style={{ color: c.primary, fontFamily: fonts.medium, ...type.label }}>
                  Today
                </Text>
              </PressFeedback>
            )}
            {iconButton('prev')}
            {iconButton('next')}
          </>
        }
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={`Showing ${STATUS_LABEL[statusFilter]} tasks. Change filter`}
          onPress={() =>
            setStatusFilter(
              statusFilter === 'all' ? 'active' : statusFilter === 'active' ? 'completed' : 'all'
            )
          }
          style={{
            minHeight: 40,
            paddingHorizontal: space.sm,
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
          }}>
          <Ionicons
            name={statusFilter === 'all' ? 'filter-outline' : 'filter'}
            color={statusFilter === 'all' ? c.onSurfaceVariant : c.primary}
            size={16}
          />
          <Text
            style={{
              color: statusFilter === 'all' ? c.onSurfaceVariant : c.onSurface,
              fontFamily: fonts.medium,
              ...type.label,
            }}>
            {STATUS_LABEL[statusFilter]}
          </Text>
        </PressFeedback>
      </View>
    </View>
  );
}
