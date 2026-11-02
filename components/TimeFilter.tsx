import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTodoStore } from '@/store/todoStore';
import { getFilterLabel, type FilterPeriod } from '@/utils/dates';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';
export function TimeFilter() {
  const {
    period,
    referenceDate,
    statusFilter,
    setPeriod,
    setStatusFilter,
    navigatePeriod,
    goToToday,
  } = useTodoStore();
  const c = useColors(),
    fonts = useFontFamily();
  return (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Text
          accessibilityRole="header"
          style={{ flex: 1, color: c.onSurface, fontFamily: fonts.medium, fontSize: 16 }}>
          {getFilterLabel(period, referenceDate)}
        </Text>
        {(['prev', 'next'] as const).map((dir) => (
          <PressFeedback
            key={dir}
            accessibilityRole="button"
            accessibilityLabel={dir === 'prev' ? 'Previous period' : 'Next period'}
            onPress={() => navigatePeriod(dir)}
            style={{
              width: 38,
              minHeight: 38,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.surfaceContainer,
            }}>
            <Ionicons
              name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={c.onSurfaceVariant}
            />
          </PressFeedback>
        ))}
        <PressFeedback
          accessibilityRole="button"
          onPress={goToToday}
          style={{ minHeight: 38, paddingHorizontal: 10, justifyContent: 'center' }}>
          <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 13 }}>Today</Text>
        </PressFeedback>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: c.surfaceContainer,
            padding: 3,
            borderRadius: 9,
          }}>
          {(['day', 'week', 'month'] as FilterPeriod[]).map((p) => (
            <PressFeedback
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: period === p }}
              onPress={() => setPeriod(p)}
              style={{
                minHeight: 32,
                paddingHorizontal: 14,
                borderRadius: 7,
                justifyContent: 'center',
                backgroundColor: period === p ? c.surfaceContainerHighest : 'transparent',
              }}>
              <Text
                style={{
                  color: period === p ? c.onSurface : c.onSurfaceVariant,
                  fontFamily: fonts.medium,
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}>
                {p}
              </Text>
            </PressFeedback>
          ))}
        </View>
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel={`Status filter: ${statusFilter}. Change filter`}
          onPress={() =>
            setStatusFilter(
              statusFilter === 'all' ? 'active' : statusFilter === 'active' ? 'completed' : 'all'
            )
          }
          style={{
            minHeight: 38,
            paddingHorizontal: 8,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}>
          <Ionicons name="filter-outline" color={c.onSurfaceVariant} size={16} />
          <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular, fontSize: 13 }}>
            {statusFilter === 'all'
              ? 'All tasks'
              : statusFilter === 'active'
                ? 'Active tasks'
                : 'Completed'}
          </Text>
        </PressFeedback>
      </View>
    </View>
  );
}
