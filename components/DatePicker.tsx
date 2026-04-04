import { useState, useCallback, memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors, useFontFamily } from '@/utils/theme';

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
    <View style={{ backgroundColor: c.surfaceContainerLow }} className="rounded-lg p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable onPress={prevMonth} className="px-3 py-1">
          <Text style={{ color: c.outline }} className="text-lg">
            ‹
          </Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-sm">
          {monthLabel}
        </Text>
        <Pressable onPress={nextMonth} className="px-3 py-1">
          <Text style={{ color: c.outline }} className="text-lg">
            ›
          </Text>
        </Pressable>
      </View>

      <View className="mb-1 flex-row">
        {WEEKDAYS.map((d) => (
          <View key={d} className="flex-1 items-center">
            <Text style={{ fontFamily: fonts.regular, color: c.outline }} className="text-xs">
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((day, i) => (
          <Pressable
            key={i}
            onPress={() =>
              day &&
              onChange(new Date(viewYear, viewMonth, day, value.getHours(), value.getMinutes()))
            }
            className="w-[14.28%] items-center py-1.5">
            {day ? (
              <View
                style={isSelected(day) ? { backgroundColor: c.primary } : undefined}
                className="h-8 w-8 items-center justify-center rounded-full">
                <Text
                  style={{
                    fontFamily: isSelected(day) || isToday(day) ? fonts.bold : fonts.regular,
                    color: isSelected(day)
                      ? c.onPrimary
                      : isToday(day)
                        ? c.primary
                        : c.onSurfaceVariant,
                  }}
                  className="text-sm">
                  {day}
                </Text>
              </View>
            ) : (
              <View className="h-8 w-8" />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const DatePicker = memo(DatePickerRaw);
