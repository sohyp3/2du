import { Platform, Pressable, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS_IN = { duration: 70, easing: Easing.out(Easing.quad) };
const PRESS_OUT = { duration: 140, easing: Easing.out(Easing.quad) };

function WebPressFeedback(props: PressableProps) {
  return (
    <Pressable
      {...props}
      testID={props.testID || 'motion-press'}
      aria-checked={props.accessibilityState?.checked}
      aria-selected={props.accessibilityState?.selected}
      aria-expanded={props.accessibilityState?.expanded}
    />
  );
}

// Press feedback runs entirely on the UI thread: pressing never re-renders the
// component, so taps respond instantly even while JS is busy.
function NativePressFeedback({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.2,
    transform: [{ scale: reduced ? 1 : 1 - pressed.value * 0.02 }],
  }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        pressed.value = withTiming(1, PRESS_IN);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, PRESS_OUT);
        onPressOut?.(e);
      }}
      style={[
        typeof style === 'function' ? style({ pressed: false, hovered: false }) : style,
        animated,
      ]}
    />
  );
}

export const PressFeedback = Platform.OS === 'web' ? WebPressFeedback : NativePressFeedback;
