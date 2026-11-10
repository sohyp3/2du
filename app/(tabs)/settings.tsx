import { SyncSettings } from '@/components/SyncSettings';
import { PressFeedback } from '@/components/PressFeedback';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { Text, View, ScrollView, Platform } from 'react-native';
import { useColors, useFontFamily } from '@/utils/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const selected = tab === 'sync' ? 'sync' : 'general';
  const router = useRouter();
  const c = useColors();
  const fonts = useFontFamily();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'web' ? 24 : insets.top + 12,
        paddingBottom: 120,
        maxWidth: 840,
        width: '100%',
        alignSelf: 'center',
      }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: 'PlayfairDisplay_400Regular', color: c.onSurface, fontSize: 26 }}>
        Settings
      </Text>
      <Text
        style={{
          color: c.onSurfaceVariant,
          fontFamily: fonts.regular,
          marginTop: 4,
          fontSize: 13,
          lineHeight: 18,
        }}>
        Make this space your own.
      </Text>
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          backgroundColor: c.surfaceContainer,
          padding: 4,
          borderRadius: 14,
          marginTop: 16,
          marginBottom: 24,
          gap: 4,
        }}>
        {(['general', 'sync'] as const).map((item) => (
          <PressFeedback
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: selected === item }}
            onPress={() => router.setParams({ tab: item })}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              backgroundColor: selected === item ? c.surfaceContainerHigh : 'transparent',
            }}>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 14,
                color: selected === item ? c.primary : c.onSurfaceVariant,
              }}>
              {item === 'general' ? 'General' : 'Sync'}
            </Text>
          </PressFeedback>
        ))}
      </View>
      {selected === 'sync' ? <SyncSettings /> : <GeneralSettings />}
    </ScrollView>
  );
}
