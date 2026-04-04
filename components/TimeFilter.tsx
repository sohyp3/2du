import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTodoStore } from '@/store/todoStore';
import { FilterPeriod, getFilterLabel } from '@/utils/dates';
import { StatusFilter } from '@/db/todos';
import { useColors, useFontFamily } from '@/utils/theme';

const PERIODS: { key: FilterPeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const STATUS_CYCLE: StatusFilter[] = ['active', 'completed', 'all'];
const STATUS_LABEL: Record<StatusFilter, string> = {
  active: 'Active',
  completed: 'Done',
  all: 'All',
};

export function TimeFilter() {
  const period = useTodoStore((s) => s.period);
  const referenceDate = useTodoStore((s) => s.referenceDate);
  const statusFilter = useTodoStore((s) => s.statusFilter);
  const setPeriod = useTodoStore((s) => s.setPeriod);
  const setStatusFilter = useTodoStore((s) => s.setStatusFilter);
  const navigatePeriod = useTodoStore((s) => s.navigatePeriod);
  const goToToday = useTodoStore((s) => s.goToToday);
  const c = useColors();
  const fonts = useFontFamily();

  const cycleStatus = useCallback(() => {
    const i = STATUS_CYCLE.indexOf(statusFilter);
    setStatusFilter(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
  }, [statusFilter, setStatusFilter]);

  const onPrev = useCallback(() => navigatePeriod('prev'), [navigatePeriod]);
  const onNext = useCallback(() => navigatePeriod('next'), [navigatePeriod]);

  return (
    <View className="mb-4 items-center">
      <Text
        style={{ fontFamily: fonts.medium, color: c.primary }}
        className="mb-2 text-xs uppercase tracking-[3px]">
        {getFilterLabel(period, referenceDate)}
      </Text>

      <View
        style={{ backgroundColor: c.surfaceContainer }}
        className="mb-2 flex-row items-center rounded-lg p-1">
        <Pressable onPress={onPrev} className="px-3 py-2">
          <Text style={{ color: c.onSurfaceVariant }} className="text-lg font-semibold">
            ‹
          </Text>
        </Pressable>

        <View className="flex-1 flex-row justify-center gap-1">
          {PERIODS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setPeriod(key)}
              style={period === key ? { backgroundColor: c.primary } : undefined}
              className="rounded-md px-4 py-1.5">
              <Text
                style={{
                  fontFamily: fonts.bold,
                  color: period === key ? c.onPrimary : c.onSurfaceVariant,
                }}
                className="text-xs uppercase tracking-[2px]">
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={onNext} className="px-3 py-2">
          <Text style={{ color: c.onSurfaceVariant }} className="text-lg font-semibold">
            ›
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={goToToday}
          style={{ backgroundColor: c.surfaceContainer }}
          className="rounded-md px-3 py-1.5">
          <Text
            style={{ fontFamily: fonts.bold, color: c.primary }}
            className="text-xs uppercase tracking-[2px]">
            Today
          </Text>
        </Pressable>

        <Pressable
          onPress={cycleStatus}
          style={{ backgroundColor: c.surfaceContainerHighest }}
          className="rounded-md px-3 py-1.5">
          <Text
            style={{ fontFamily: fonts.bold, color: c.onSurface }}
            className="text-xs uppercase tracking-[2px]">
            {STATUS_LABEL[statusFilter]}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
