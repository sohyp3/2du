import { useEffect } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSyncStore } from '@/store/syncStore';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

function ago(iso: string | null) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!(minutes >= 1)) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

/** A small sync status pill. Pressing it opens the account settings. */
export function SyncChip() {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const token = useSyncStore((s) => s.token),
    busy = useSyncStore((s) => s.busy),
    error = useSyncStore((s) => s.error),
    lastSync = useSyncStore((s) => s.lastSync),
    pending = useSyncStore((s) => s.pending);

  const state = !token
    ? { label: 'Not signed in', icon: 'cloud-offline-outline', color: c.onSurfaceVariant }
    : busy
      ? { label: 'Syncing…', icon: 'sync', color: c.primary }
      : error
        ? { label: 'Offline', icon: 'warning-outline', color: c.warning }
        : pending > 0
          ? { label: `${pending} waiting`, icon: 'time-outline', color: c.onSurfaceVariant }
          : {
              label: lastSync ? `Synced · ${ago(lastSync)}` : 'Synced',
              icon: 'cloud-done-outline',
              color: c.success,
            };
  const spinning = !!token && busy;

  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (spinning && !reduced) {
      turn.value = 0;
      turn.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
    } else {
      cancelAnimation(turn);
      turn.value = 0;
    }
  }, [spinning, reduced, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));

  return (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={`${state.label}. Open account settings`}
      onPress={() => router.push({ pathname: '/settings', params: { section: 'account' } })}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        minHeight: 36,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        backgroundColor: c.surfaceContainer,
      }}>
      <Animated.View style={spin}>
        <Ionicons
          name={state.icon as keyof typeof Ionicons.glyphMap}
          size={16}
          color={state.color}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={{ fontFamily: fonts.medium, color: state.color, ...type.label }}>
        {state.label}
      </Text>
    </PressFeedback>
  );
}
