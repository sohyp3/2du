import { memo, useCallback, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Todo } from '@/db/todos';
import { formatTodoMeta } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useColors, useFontFamily } from '@/utils/theme';

function TodoItemRaw({ todo }: { todo: Todo }) {
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const period = useTodoStore((s) => s.period);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const router = useRouter();
  const isCompleted = todo.status === 'completed';
  const c = useColors();
  const fonts = useFontFamily();

  const checkScale = useSharedValue(1);
  const rowOpacity = useSharedValue(isCompleted ? 0.5 : 1);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const rowAnimStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
  }));

  const pendingRef = useRef(false);

  const doToggle = useCallback(() => {
    toggleComplete(todo.id);
    pendingRef.current = false;
  }, [todo.id, toggleComplete]);

  const onCheck = useCallback(() => {
    if (pendingRef.current) return;

    if (!isCompleted) {
      // Marking as done: sound + 1s animation, then toggle
      pendingRef.current = true;

      // Play ting sound
      try {
        const { Audio } = require('expo-av');
        Audio.Sound.createAsync(require('@/assets/ting.mp3')).then(({ sound }: { sound: any }) => {
          sound.playAsync();
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.didJustFinish) sound.unloadAsync();
          });
        });
      } catch {}

      // Animate: bounce check + fade, then trigger toggle after 1s
      checkScale.value = withSequence(
        withSpring(1.6, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      rowOpacity.value = withDelay(
        700,
        withTiming(0.5, { duration: 300 }, (finished) => {
          if (finished) runOnJS(doToggle)();
        })
      );
    } else {
      // Un-completing: immediate
      checkScale.value = withSequence(
        withSpring(1.4, { damping: 4, stiffness: 300 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      rowOpacity.value = withTiming(1, { duration: 300 });
      toggleComplete(todo.id);
    }
  }, [todo.id, isCompleted, toggleComplete, doToggle, checkScale, rowOpacity]);

  const onPress = useCallback(() => {
    router.push(`/todo/${todo.id}`);
  }, [todo.id, router]);

  const meta = formatTodoMeta(todo.datetime, period, timeFormat === '24h');

  return (
    <Animated.View style={rowAnimStyle} className="mb-2">
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
    </Animated.View>
  );
}

export const TodoItem = memo(TodoItemRaw);
