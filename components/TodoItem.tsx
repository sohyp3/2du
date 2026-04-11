import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Todo } from '@/db/todos';
import { formatTodoMeta } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useColors, useFontFamily } from '@/utils/theme';

const tingSound = require('@/assets/ting.mp3');

function TodoItemRaw({ todo }: { todo: Todo }) {
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const period = useTodoStore((s) => s.period);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const router = useRouter();
  const isCompleted = todo.status === 'completed';
  const c = useColors();
  const fonts = useFontFamily();

  const checkScale = useSharedValue(1);
  const tickOpacity = useSharedValue(0);
  const tickScale = useSharedValue(0);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const tickAnimStyle = useAnimatedStyle(() => ({
    opacity: tickOpacity.value,
    transform: [{ scale: tickScale.value }],
  }));

  const onCheck = useCallback(() => {
    if (!isCompleted) {
      Audio.Sound.createAsync(tingSound, { shouldPlay: true }).then(({ sound }) => {
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
        });
      });

      tickScale.value = withTiming(1.3, { duration: 300 });
      tickOpacity.value = withTiming(1, { duration: 300 }, () => {
        runOnJS(toggleComplete)(todo.id);
        tickOpacity.value = withTiming(0, { duration: 500 });
        tickScale.value = withTiming(0, { duration: 500 });
      });

      checkScale.value = withSequence(
        withTiming(0.9, { duration: 200 }),
        withTiming(1.1, { duration: 300 }),
        withTiming(1, { duration: 200 })
      );
    } else {
      tickOpacity.value = 0;
      tickScale.value = 0;
      checkScale.value = withSequence(
        withTiming(1.4, { duration: 120 }),
        withTiming(1, { duration: 120 })
      );
      toggleComplete(todo.id);
    }
  }, [todo.id, isCompleted, toggleComplete, checkScale, tickOpacity, tickScale]);

  const onPress = useCallback(() => {
    router.push(`/todo/${todo.id}`);
  }, [todo.id, router]);

  const meta = formatTodoMeta(todo.datetime, period, timeFormat === '24h');

  return (
    <View className="mb-2">
      <View
        style={{ backgroundColor: c.surfaceContainer, opacity: isCompleted ? 0.5 : 1 }}
        className="rounded-lg p-4">
        <View className="flex-row items-center">
          <Pressable onPress={onCheck} hitSlop={8} className="mr-3">
            <Animated.View
              style={[
                checkAnimStyle,
                {
                  borderColor: isCompleted ? c.primary : c.onSurfaceVariant,
                  backgroundColor: isCompleted ? c.primary : 'transparent',
                },
              ]}
              className="h-6 w-6 items-center justify-center rounded-full border-2">
              {isCompleted && (
                <Text style={{ color: c.onPrimary }} className="text-xs">
                  ✓
                </Text>
              )}
            </Animated.View>
            <Animated.Text
              style={[
                tickAnimStyle,
                {
                  position: 'absolute',
                  color: c.primary,
                  fontSize: 20,
                  fontWeight: 'bold',
                },
              ]}
              className="left-1 top-0">
              ✓
            </Animated.Text>
          </Pressable>

          <Pressable onPress={onPress} className="flex-1 flex-row items-center">
            <View className="flex-1">
              <Text
                style={{
                  fontFamily: fonts.medium,
                  color: isCompleted ? c.onSurfaceVariant : c.onSurface,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                }}
                className="text-base">
                {todo.name}
              </Text>
              {todo.description ? (
                <Text
                  style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}
                  className="mt-0.5 text-sm"
                  numberOfLines={1}>
                  {todo.description}
                </Text>
              ) : null}
            </View>

            <View className="items-end pl-3">
              <Text
                style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
                className="text-xs">
                {meta}
              </Text>
              {todo.time_needed ? (
                <Text
                  style={{ fontFamily: fonts.regular, color: c.outline }}
                  className="mt-0.5 text-xs">
                  {todo.time_needed}m
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const TodoItem = memo(TodoItemRaw);
