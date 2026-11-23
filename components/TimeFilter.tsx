import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTodoStore } from '@/store/todoStore';
import { getFilterLabel, type FilterPeriod } from '@/utils/dates';
import { DISPLAY_FONT_SEMI, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
import { HeaderAction } from './ScreenHeader';
import { Segmented } from './Chip';

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const satisfies readonly { value: FilterPeriod; label: string }[];
const CURRENT = new Set(['Today', 'This Week', 'This Month']);
const STATUS_LABEL = { all: 'All', active: 'Active', completed: 'Done' } as const;

/** The period bar: the period title with round prev and next, then period and status. */
export function TimeFilter() {
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
    <HeaderAction
      key={dir}
      icon={dir === 'prev' ? 'chevron-back' : 'chevron-forward'}
      label={dir === 'prev' ? 'Previous period' : 'Next period'}
      onPress={() => navigatePeriod(dir)}
    />
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: space.sm,
        columnGap: space.lg,
      }}>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
        }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            flexShrink: 1,
            fontFamily: DISPLAY_FONT_SEMI,
            fontSize: 22,
            lineHeight: 28,
            color: c.onSurface,
          }}>
          {label}
        </Text>
        {iconButton('prev')}
        {iconButton('next')}
        {!CURRENT.has(label) && (
          <PressFeedback
            accessibilityRole="button"
            onPress={goToToday}
            style={{ minHeight: 40, paddingHorizontal: space.sm, justifyContent: 'center' }}>
            <Text style={{ color: c.primary, fontFamily: fonts.bold, ...type.label }}>Today</Text>
          </PressFeedback>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
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
