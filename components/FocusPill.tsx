import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusStore, type FocusSession } from '@/store/focusStore';
import { formatClock, useRemaining } from '@/utils/clock';
import { radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

function Pill({ session }: { session: FocusSession }) {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const remaining = useRemaining(session.endsAt);
  return (
    <PressFeedback
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
        borderRadius: radius.lg,
        backgroundColor: c.primaryContainer,
      }}>
      <Ionicons name="timer-outline" size={18} color={c.primaryDim} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontFamily: fonts.medium, color: c.onSurface, ...type.label }}>
        {session.name}
      </Text>
      <View>
        <Text style={{ fontFamily: fonts.medium, color: c.primaryDim, ...type.label }}>
          {remaining > 0 ? formatClock(remaining) : 'Time is up'}
        </Text>
      </View>
    </PressFeedback>
  );
}

/** A slim bar on the Tasks screen while a focus session runs; tap to return to the timer. */
export function FocusPill() {
  const session = useFocusStore((s) => s.session);
  return session ? <Pill session={session} /> : null;
}
