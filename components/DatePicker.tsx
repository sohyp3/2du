import { useState, useCallback, memo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function DatePickerRaw({ value, onChange }: DatePickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const c = useColors();
  const fonts = useFontFamily();

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const isSelected = (day: number) =>
    value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View
      style={{ backgroundColor: c.surfaceContainer, borderRadius: radius.md, padding: space.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.sm,
        }}>
        <PressFeedback
          onPress={prevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="chevron-back" size={18} color={c.onSurfaceVariant} />
        </PressFeedback>
        <Text style={{ fontFamily: fonts.bold, color: c.onSurface, ...type.label }}>
          {monthLabel}
        </Text>
        <PressFeedback
          onPress={nextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="chevron-forward" size={18} color={c.onSurfaceVariant} />
        </PressFeedback>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: space.xs }}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bold, color: c.outline, ...type.caption }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={{ width: '14.28%', height: 40 }} />;
          const selected = isSelected(day),
            current = isToday(day);
          return (
            <PressFeedback
              key={i}
              accessibilityRole="button"
              accessibilityLabel={new Date(viewYear, viewMonth, day).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              accessibilityState={{ selected }}
              onPress={() =>
                onChange(new Date(viewYear, viewMonth, day, value.getHours(), value.getMinutes()))
              }
              style={{
                width: '14.28%',
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                backgroundColor: selected ? c.accentSoft : 'transparent',
              }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: current ? c.primary : 'transparent',
                }}>
                <Text
                  style={{
                    fontFamily: selected || current ? fonts.bold : fonts.regular,
                    color: current ? c.onPrimary : c.onSurface,
                    ...type.label,
                  }}>
                  {day}
                </Text>
              </View>
            </PressFeedback>
          );
        })}
      </View>
    </View>
  );
}

export const DatePicker = memo(DatePickerRaw);
