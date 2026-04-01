import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Todo } from '@/db/todos';
import { formatTime } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-gray-300',
  moderate: 'border-l-primary-300',
  urgent: 'border-l-red-400',
};

function TodoItemRaw({ todo }: { todo: Todo }) {
  const toggleComplete = useTodoStore((s) => s.toggleComplete);
  const router = useRouter();
  const isCompleted = todo.status === 'completed';

  const checkScale = useSharedValue(1);
  const rowOpacity = useSharedValue(isCompleted ? 0.7 : 1);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const rowAnimStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
  }));

  const onCheck = useCallback(() => {
    // Bounce animation on the checkbox
    checkScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    // Fade row on complete, restore on uncomplete
    rowOpacity.value = withTiming(isCompleted ? 1 : 0.7, { duration: 300 });
    toggleComplete(todo.id);
  }, [todo.id, isCompleted, toggleComplete, checkScale, rowOpacity]);

  const onPress = useCallback(() => {
    router.push(`/todo/${todo.id}`);
  }, [todo.id, router]);

  return (
    <Animated.View style={rowAnimStyle} className="mb-2">
      <View
        className={`flex-row items-center rounded-xl border-l-4 bg-white p-4 shadow-sm ${PRIORITY_BORDER[todo.priority]}`}>
        {/* Checkbox — toggles completion */}
        <Pressable onPress={onCheck} hitSlop={8} className="mr-3">
          <Animated.View
            style={checkAnimStyle}
            className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
              isCompleted ? 'border-primary-400 bg-primary-400' : 'border-gray-300'
            }`}>
            {isCompleted && <Text className="text-sm text-white">✓</Text>}
          </Animated.View>
        </Pressable>

        {/* Body — navigates to detail */}
        <Pressable onPress={onPress} className="flex-1 flex-row items-center">
          <View className="flex-1">
            <Text
              className={`text-base font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {todo.name}
            </Text>
            {todo.description ? (
              <Text className="mt-0.5 text-sm text-gray-500" numberOfLines={1}>
                {todo.description}
              </Text>
            ) : null}
          </View>

          <View className="items-end pl-3">
            <Text className="text-sm text-gray-400">{formatTime(todo.datetime)}</Text>
            {todo.time_needed ? (
              <Text className="mt-0.5 text-xs text-gray-400">{todo.time_needed}m</Text>
            ) : null}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export const TodoItem = memo(TodoItemRaw);
