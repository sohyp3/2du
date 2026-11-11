import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useBriefStore } from '@/store/briefStore';
import { useThemeStore } from '@/store/themeStore';
import { getSetting, setSetting } from '@/db/database';
import { localDateKey } from '@/shared/localDate';
import { useColors, useFontFamily } from '@/utils/theme';
import { PressFeedback } from './PressFeedback';

export function BriefCard() {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const today = useBriefStore((s) => s.today);
  const zen = useThemeStore((s) => s.zenMode);
  // Unknown until the setting is read, so a dismissed card never flashes.
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void getSetting('brief_dismissed').then(setDismissed);
  }, []);
  if (!today || zen || dismissed === undefined || dismissed === localDateKey(new Date()))
    return null;
  const preview = today.content
    .split('\n')
    .map((l) =>
      l
        .replace(/^[\s#*\-~>]+/, '')
        .replace(/[*~_`]/g, '')
        .trim()
    )
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');
  const dismiss = () => {
    const key = localDateKey(new Date());
    setDismissed(key);
    void setSetting('brief_dismissed', key).catch((e) =>
      console.error('Failed to save brief dismissal:', e)
    );
  };
  return (
    <View
      style={{
        backgroundColor: c.surfaceContainer,
        borderRadius: 16,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel="Open today's brief"
        onPress={() => router.push('/brief')}
        style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Ionicons name="sunny-outline" size={16} color={c.primary} />
          <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 12 }}>
            Today&apos;s brief
          </Text>
        </View>
        <Text
          numberOfLines={3}
          style={{
            color: c.onSurface,
            fontFamily: fonts.regular,
            fontSize: 14,
            lineHeight: 20,
            writingDirection: 'auto',
          }}>
          {preview}
        </Text>
      </PressFeedback>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel="Dismiss today's brief"
        onPress={dismiss}
        style={{
          width: 44,
          height: 44,
          marginTop: -10,
          marginRight: -10,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="close" size={18} color={c.onSurfaceVariant} />
      </PressFeedback>
    </View>
  );
}
