import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from './Card';
import { useBriefStore } from '@/store/briefStore';
import { useThemeStore } from '@/store/themeStore';
import { getSetting, setSetting } from '@/db/database';
import { localDateKey } from '@/shared/localDate';
import { DISPLAY_FONT_SEMI, space, type, useColors, useFontFamily } from '@/utils/theme';
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
    <Card
      tone="soft"
      style={{ marginBottom: space.sm, flexDirection: 'row', alignItems: 'flex-start' }}>
      <PressFeedback
        accessibilityRole="button"
        accessibilityLabel="Open today's brief"
        onPress={() => router.push('/brief')}
        style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            marginBottom: space.xs,
          }}>
          <Text style={{ fontSize: 20 }}>📰</Text>
          <Text style={{ color: c.onSurface, fontFamily: DISPLAY_FONT_SEMI, ...type.title }}>
            Today&apos;s brief
          </Text>
        </View>
        <Text
          numberOfLines={3}
          style={{
            color: c.onSurfaceVariant,
            fontFamily: fonts.regular,
            ...type.body,
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
          marginTop: -space.md,
          marginRight: -space.md,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="close" size={18} color={c.onSurfaceVariant} />
      </PressFeedback>
    </Card>
  );
}
