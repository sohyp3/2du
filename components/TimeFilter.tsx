import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTodoStore } from '@/store/todoStore';
import { FilterPeriod, getFilterLabel } from '@/utils/dates';
import { StatusFilter } from '@/db/todos';

const PERIODS: { key: FilterPeriod; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
  { key: 'all', label: 'All' },
];

export function TimeFilter() {
  const period = useTodoStore((s) => s.period);
  const referenceDate = useTodoStore((s) => s.referenceDate);
  const statusFilter = useTodoStore((s) => s.statusFilter);
  const setPeriod = useTodoStore((s) => s.setPeriod);
  const setStatusFilter = useTodoStore((s) => s.setStatusFilter);
  const navigatePeriod = useTodoStore((s) => s.navigatePeriod);
  const goToToday = useTodoStore((s) => s.goToToday);

  const onPrev = useCallback(() => navigatePeriod('prev'), [navigatePeriod]);
  const onNext = useCallback(() => navigatePeriod('next'), [navigatePeriod]);

  return (
    <View className="mb-3">
      {/* Navigation row */}
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable onPress={onPrev} className="px-3 py-2">
          <Text className="text-xl text-gray-400">‹</Text>
        </Pressable>

        <Text className="flex-1 text-center text-lg font-bold text-gray-800">
          {getFilterLabel(period, referenceDate)}
        </Text>

        <Pressable onPress={onNext} className="px-3 py-2">
          <Text className="text-xl text-gray-400">›</Text>
        </Pressable>
      </View>

      {/* Period + Reset row */}
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row gap-1.5">
          {PERIODS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setPeriod(key)}
              className={`rounded-full px-4 py-1 ${period === key ? 'bg-primary-200' : 'bg-gray-100'}`}>
              <Text
                className={`text-sm font-medium ${period === key ? 'text-primary-800' : 'text-gray-500'}`}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={goToToday} className="rounded-full bg-primary-100 px-3 py-1">
          <Text className="text-sm font-medium text-primary-700">Reset</Text>
        </Pressable>
      </View>

      {/* Status filter row */}
      <View className="flex-row gap-1.5">
        {STATUSES.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setStatusFilter(key)}
            className={`rounded-full px-4 py-1 ${statusFilter === key ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <Text
              className={`text-sm font-medium ${statusFilter === key ? 'text-white' : 'text-gray-500'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
