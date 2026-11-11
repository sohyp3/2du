import { SyncSettings } from '@/components/SyncSettings';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Segmented } from '@/components/Chip';
import { View, ScrollView, Platform } from 'react-native';
import { space, useColors } from '@/utils/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const selected = tab === 'sync' ? 'sync' : 'general';
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'web' ? space.xl : insets.top + space.md,
        paddingBottom: 120,
        maxWidth: 840,
        width: '100%',
        alignSelf: 'center',
      }}>
      <ScreenHeader title="Settings" subtitle="Make this space your own." inset={false} />
      <View style={{ marginTop: space.xs, marginBottom: space.xl }}>
        <Segmented
          grow
          options={[
            { value: 'general', label: 'General' },
            { value: 'sync', label: 'Sync' },
          ]}
          value={selected}
          onChange={(tab) => router.setParams({ tab })}
        />
      </View>
      {selected === 'sync' ? <SyncSettings /> : <GeneralSettings />}
    </ScrollView>
  );
}
