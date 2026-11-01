import { useState } from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function PressFeedback({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  if (Platform.OS === 'web')
    return (
      <Pressable
        {...props}
        testID={props.testID || 'motion-press'}
        aria-checked={props.accessibilityState?.checked}
        aria-selected={props.accessibilityState?.selected}
        aria-expanded={props.accessibilityState?.expanded}
        style={style}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    );
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[
        typeof style === 'function' ? style({ pressed, hovered: false }) : style,
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed && !reduced ? 0.98 : 1 }],
          transitionProperty: ['transform', 'opacity'],
          transitionDuration: 120,
          transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
        },
      ]}
    />
  );
}
