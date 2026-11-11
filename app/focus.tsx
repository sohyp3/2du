import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusStore } from '@/store/focusStore';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from '@/components/PressFeedback';
import { playTing } from '@/utils/ting';
import { formatClock, useRemaining } from '@/utils/clock';

// Each glyph sits in a fixed-width cell: custom fonts don't reliably honour tabular numerals,
// and digits that change width make the whole clock shimmy every second.
function Clock({ ms, size, color }: { ms: number; size: number; color: string }) {
  const text = formatClock(ms);
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${text} remaining`}
      style={{ flexDirection: 'row', justifyContent: 'center' }}>
      {text.split('').map((ch, i) => (
        <Text
          key={i}
          style={{
            width: size * (ch === ':' ? 0.32 : 0.6),
            textAlign: 'center',
            fontFamily: DISPLAY_FONT,
            fontSize: size,
            lineHeight: size * 1.15,
            color,
          }}>
          {ch}
        </Text>
      ))}
    </View>
  );
}

function Countdown({ endsAt, minutes }: { endsAt: number; minutes: number }) {
  const c = useColors(),
    fonts = useFontFamily();
  const { width } = useWindowDimensions();
  const remaining = useRemaining(endsAt);
  const over = remaining <= 0;
  // The end each alert was played for; +5 moves `endsAt`, which re-arms it.
  const announced = useRef<number | null>(null);

  useEffect(() => {
    if (!over || announced.current === endsAt) return;
    announced.current = endsAt;
    // Native devices get the scheduled notification (with sound); the web has no scheduler.
    if (Platform.OS !== 'web') return;
    void playTing();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
      new Notification('Time is up', { body: useFocusStore.getState().session?.name });
  }, [over, endsAt]);

  const progress = minutes > 0 ? 1 - remaining / (minutes * 60_000) : 1;
  const size = Math.min(96, Math.max(64, width * 0.2));
  return (
    <View style={{ alignItems: 'center', gap: space.xl }}>
      <Clock ms={remaining} size={size} color={over ? c.primary : c.onSurface} />
      <View
        style={{
          width: Math.min(280, width - 96),
          height: 3,
          borderRadius: 2,
          backgroundColor: c.surfaceContainerHigh,
          overflow: 'hidden',
        }}>
        <View
          style={{
            height: 3,
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            backgroundColor: c.primary,
          }}
        />
      </View>
      <Text
        style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant, ...type.label }}
        accessibilityLiveRegion="polite">
        {over ? 'Time is up' : `${Math.round(minutes)} min session`}
      </Text>
    </View>
  );
}

export default function FocusScreen() {
  useKeepAwake();
  const c = useColors(),
    fonts = useFontFamily();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; minutes?: string }>();
  const session = useFocusStore((s) => s.session);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let live = true;
    const store = useFocusStore.getState();
    const minutes = Number(params.minutes) || null;
    (async () => {
      await store.load();
      const next = params.id
        ? await store.start(params.id, minutes)
        : useFocusStore.getState().session;
      if (!live) return;
      setStarting(false);
      if (!next) leave();
    })().catch((error) => {
      console.error('Failed to start focus:', error);
      if (live) leave();
    });
    return () => {
      live = false;
    };
    // Start once per opened task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const done = () => {
    void playTing();
    void useFocusStore.getState().finish();
    leave();
  };
  const cancel = () => {
    void useFocusStore.getState().cancel();
    leave();
  };
  const adjust = (delta: number) => useFocusStore.getState().adjust(delta);

  const step = (delta: number) => (
    <PressFeedback
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Add 5 minutes' : 'Remove 5 minutes'}
      onPress={() => adjust(delta)}
      style={{
        minWidth: 72,
        minHeight: 44,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceContainer,
      }}>
      <Text style={{ fontFamily: fonts.medium, color: c.onSurface, ...type.label }}>
        {delta > 0 ? '+5 min' : '−5 min'}
      </Text>
    </PressFeedback>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        paddingTop: insets.top + space.sm,
        paddingBottom: insets.bottom + space.lg,
        paddingHorizontal: space.xl,
      }}>
      <Stack.Screen options={{ title: session?.name ?? 'Focus' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PressFeedback
          accessibilityRole="button"
          accessibilityLabel="Minimise, the timer keeps running"
          onPress={leave}
          style={{
            width: 44,
            height: 44,
            marginLeft: -space.md,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="chevron-down" size={24} color={c.onSurfaceVariant} />
        </PressFeedback>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: space.xxl * 1.5 }}>
        <Text
          accessibilityRole="header"
          numberOfLines={3}
          style={{
            textAlign: 'center',
            fontFamily: fonts.medium,
            color: c.onSurface,
            fontSize: 20,
            lineHeight: 28,
            writingDirection: 'auto',
          }}>
          {session?.name ?? ''}
        </Text>
        {session && !starting ? (
          <Countdown endsAt={session.endsAt} minutes={session.minutes} />
        ) : (
          <View style={{ height: 160 }} />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md }}>
          {step(-5)}
          {step(5)}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: space.md,
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
        }}>
        <PressFeedback
          accessibilityRole="button"
          accessibilityHint="Stops the timer and puts the task back"
          onPress={cancel}
          style={{
            flex: 1,
            minHeight: 56,
            borderRadius: radius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.surfaceContainerHighest,
          }}>
          <Text style={{ fontFamily: fonts.medium, color: c.onSurface, ...type.body }}>Cancel</Text>
        </PressFeedback>
        <PressFeedback
          accessibilityRole="button"
          accessibilityHint="Marks the task done"
          onPress={done}
          style={{
            flex: 1,
            minHeight: 56,
            borderRadius: radius.lg,
            flexDirection: 'row',
            gap: space.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.primary,
          }}>
          <Ionicons name="checkmark" size={20} color={c.onPrimary} />
          <Text style={{ fontFamily: fonts.bold, color: c.onPrimary, ...type.body }}>Done</Text>
        </PressFeedback>
      </View>
    </View>
  );
}
