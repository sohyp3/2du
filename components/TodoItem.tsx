import { memo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { Priority, Todo } from '@/db/todos';
import { formatTodoMeta } from '@/utils/dates';
import { useTodoStore } from '@/store/todoStore';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useGoalStore } from '@/store/goalStore';
import { contrastText, SWATCHES } from '@/utils/palette';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import * as haptics from '@/utils/haptics';
import { Card } from './Card';
import { PressFeedback } from './PressFeedback';
import { playTing } from '@/utils/ting';

const BOX = 28;
const DOT = 6;
const BURST_DOTS = 6;
const BURST_REACH = 24;
const POP = { duration: 220, dampingRatio: 0.5 };
const SETTLE = { duration: 260, dampingRatio: 0.7 };
const BURST = { duration: 400, easing: Easing.bezier(0.23, 1, 0.32, 1) };
// Old rows can carry other values (the column defaults to 'medium'); those get no pill.
const PRIORITIES = new Set<string>(['urgent', 'moderate', 'low']);

/** One dot of the completion burst: flies out along its angle and fades as `progress` runs. */
function BurstDot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / BURST_DOTS) * Math.PI * 2;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      // The eased flight is mostly done early; hold the dots visible and fade them late.
      opacity: p > 0 && p < 1 ? 1 - p ** 4 : 0,
      transform: [
        { translateX: Math.cos(angle) * BURST_REACH * p },
        { translateY: Math.sin(angle) * BURST_REACH * p },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: (BOX - DOT) / 2,
          top: (BOX - DOT) / 2,
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: SWATCHES[(index * 2) % SWATCHES.length],
        },
        style,
      ]}
    />
  );
}

function PriorityPill({ priority }: { priority: Priority }) {
  const c = useColors(),
    fonts = useFontFamily();
  const fill = priority === 'urgent' ? c.error : priority === 'moderate' ? c.warning : undefined;
  return (
    <View
      style={{
        paddingHorizontal: space.sm,
        height: 20,
        borderRadius: radius.pill,
        justifyContent: 'center',
        backgroundColor: fill ?? 'transparent',
        borderWidth: fill ? 0 : 1,
        borderColor: c.outline,
      }}>
      <Text
        style={{
          fontFamily: fonts.bold,
          ...type.caption,
          color: fill ? contrastText(fill) : c.onSurfaceVariant,
        }}>
        {priority === 'urgent' ? 'Urgent' : priority === 'moderate' ? 'Moderate' : 'Low'}
      </Text>
    </View>
  );
}

export const TodoItem = memo(function TodoItem({ todo }: { todo: Todo }) {
  // Narrow selector: a row re-renders only when its own goal's name changes.
  const goalName = useGoalStore((s) => s.goals.find((g) => g.id === todo.goal_id)?.name);
  const toggle = useTodoStore((s) => s.toggleComplete),
    period = useTodoStore((s) => s.period);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const calendar = useCalendarsStore((s) =>
    s.calendars.find((c) => c.id === (todo.calendar_id || 'daily'))
  );
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const done = todo.status === 'completed';
  const inProgress = todo.status === 'in_progress';
  const ring = calendar?.color || c.primary;
  const complete = () => {
    if (!done) {
      void playTing();
      haptics.success();
      if (!reduced) {
        scale.set(withSequence(withSpring(1.25, POP), withSpring(1, SETTLE)));
        burst.set(0);
        burst.set(withTiming(1, BURST));
      }
    }
    void toggle(todo.id);
  };
  const meta = [
    formatTodoMeta(todo.datetime, period, timeFormat === '24h'),
    todo.time_needed ? `${todo.time_needed} min` : '',
    todo.description ? todo.description.split('\n')[0] : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card
      padded={false}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 64,
        marginBottom: space.sm,
        paddingLeft: space.sm,
      }}>
      <PressFeedback
        accessibilityRole="checkbox"
        accessibilityLabel={`Complete ${todo.name}`}
        accessibilityState={{ checked: done }}
        onPress={complete}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: BOX, height: BOX }}>
          {Array.from({ length: BURST_DOTS }, (_, i) => (
            <BurstDot key={i} index={i} progress={burst} />
          ))}
          <Animated.View
            style={[
              {
                width: BOX,
                height: BOX,
                borderRadius: BOX / 2,
                borderWidth: 2,
                borderColor: ring,
                backgroundColor: done ? ring : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              },
              boxStyle,
            ]}>
            {done ? (
              <Ionicons name="checkmark" size={18} color={contrastText(ring)} />
            ) : inProgress ? (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ring }} />
            ) : null}
          </Animated.View>
        </View>
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel={`Edit ${todo.name}`}
        onPress={() => router.push(`/todo/${todo.id}`)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 64,
          justifyContent: 'center',
          paddingVertical: space.md,
          paddingLeft: space.xs,
          paddingRight: space.lg,
        }}>
        <Text
          style={{
            fontFamily: fonts.bold,
            ...type.body,
            color: done ? c.onSurfaceVariant : c.onSurface,
            textDecorationLine: done ? 'line-through' : 'none',
            textDecorationColor: c.onSurfaceVariant,
          }}>
          {todo.name}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: space.xs + 2,
            alignItems: 'center',
            marginTop: space.xs,
          }}>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: fonts.regular,
              color: c.onSurfaceVariant,
              ...type.caption,
            }}>
            {meta}
          </Text>
          {PRIORITIES.has(todo.priority) && !done && <PriorityPill priority={todo.priority} />}
          {goalName ? (
            <View
              style={{
                paddingHorizontal: space.sm,
                height: 20,
                borderRadius: radius.pill,
                justifyContent: 'center',
                backgroundColor: c.accentSoft,
                maxWidth: 160,
              }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: fonts.medium, ...type.caption, color: c.onSurface }}>
                {goalName}
              </Text>
            </View>
          ) : null}
        </View>
      </PressFeedback>
    </Card>
  );
});
