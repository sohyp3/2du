import { useEffect } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusStore, type FocusSession } from '@/store/focusStore';
import { formatClock, useRemaining } from '@/utils/clock';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

/** A live dot that breathes while the timer runs; still under reduced motion. */
function PulseDot({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduced) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]}
    />
  );
}

function Pill({ session }: { session: FocusSession }) {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const remaining = useRemaining(session.endsAt);
  return (
    <PressFeedback
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={`Focusing on ${session.name}, ${formatClock(remaining)} left. Open timer`}
      onPress={() => router.push('/focus')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 48,
        paddingHorizontal: space.lg,
        marginVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: c.primary,
      }}>
      <PulseDot color={c.onPrimary} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontFamily: fonts.bold, color: c.onPrimary, ...type.label }}>
        {session.name}
      </Text>
      <Text style={{ fontFamily: fonts.bold, color: c.onPrimary, ...type.label }}>
        {remaining > 0 ? formatClock(remaining) : 'Time is up'}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={c.onPrimary} />
    </PressFeedback>
  );
}

/** A slim bar on the Tasks screen while a focus session runs; tap to return to the timer. */
export function FocusPill() {
  const session = useFocusStore((s) => s.session);
  return session ? <Pill session={session} /> : null;
}
