import { Stack, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';

export default function NotFoundScreen() {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.md,
      }}>
      <Stack.Screen options={{ title: 'Nothing here' }} />
      <Text style={{ fontSize: 64, lineHeight: 76 }} accessibilityElementsHidden>
        🧭
      </Text>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: DISPLAY_FONT, color: c.onSurface, ...type.display }}>
        Nothing here
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          color: c.onSurfaceVariant,
          ...type.body,
          textAlign: 'center',
        }}>
        {"This page doesn't exist."}
      </Text>
      <PressFeedback
        haptic="tap"
        accessibilityRole="link"
        onPress={() => router.replace('/')}
        style={{
          marginTop: space.md,
          minHeight: 52,
          paddingHorizontal: space.xl,
          borderRadius: radius.pill,
          justifyContent: 'center',
          backgroundColor: c.primary,
        }}>
        <Text style={{ fontFamily: fonts.bold, color: c.onPrimary, ...type.body }}>
          Back to tasks
        </Text>
      </PressFeedback>
    </View>
  );
}
