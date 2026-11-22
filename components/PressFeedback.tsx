import { Platform, Pressable, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as haptics from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 15, stiffness: 400 };
const FADE = { duration: 120, easing: Easing.out(Easing.quad) };

export type PressFeedbackProps = PressableProps & {
  /** A haptic on press-in (phones only). */
  haptic?: 'tap' | 'select';
};

function WebPressFeedback({ haptic: _haptic, ...props }: PressFeedbackProps) {
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
function NativePressFeedback({
  style,
  onPressIn,
  onPressOut,
  haptic,
  ...props
}: PressFeedbackProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);
  const animated = useAnimatedStyle(() =>
    reduced ? { opacity: fade.value } : { transform: [{ scale: scale.value }] }
  );
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        if (reduced) fade.value = withTiming(0.7, FADE);
        else scale.value = withSpring(0.96, SPRING);
        if (haptic) haptics[haptic]();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (reduced) fade.value = withTiming(1, FADE);
        else scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      style={[
        typeof style === 'function' ? style({ pressed: false, hovered: false }) : style,
        animated,
      ]}
    />
  );
}

export const PressFeedback: (props: PressFeedbackProps) => React.JSX.Element =
  Platform.OS === 'web' ? WebPressFeedback : NativePressFeedback;
