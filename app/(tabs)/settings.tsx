import { Text, View, Pressable, ScrollView } from 'react-native';
import { useThemeStore, THEMES, FONTS, FONT_FAMILIES } from '@/store/themeStore';
import { useColors, useFontFamily } from '@/utils/theme';

export default function SettingsScreen() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const fontKey = useThemeStore((s) => s.fontKey);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setFont = useThemeStore((s) => s.setFont);
  const c = useColors();
  const fonts = useFontFamily();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.surface }} className="px-5 pt-14">
      <Text style={{ fontFamily: fonts.bold, color: c.onSurface }} className="mb-8 text-3xl">
        Settings
      </Text>

      <Text
        style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
        className="mb-3 text-xs uppercase tracking-[3px]">
        Theme
      </Text>

      <View className="mb-8 flex-row gap-3">
        {THEMES.map((t) => {
          const selected = t.key === themeKey;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTheme(t.key)}
              style={{
                backgroundColor: t.preview.bg,
                borderColor: selected ? c.primary : c.outlineVariant,
              }}
              className={`flex-1 items-center rounded-2xl border-2 p-5`}>
              <View
                style={{ backgroundColor: t.preview.accent }}
                className="mb-3 h-10 w-10 rounded-full"
              />
              <Text
                style={{
                  fontFamily: fonts.medium,
                  color: t.key === 'gold' ? '#ece4d4' : '#1a1a1a',
                }}
                className="text-sm">
                {t.label}
              </Text>
              {selected && (
                <View
                  style={{ backgroundColor: t.preview.accent }}
                  className="mt-2 h-1.5 w-6 rounded-full"
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text
        style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
        className="mb-3 text-xs uppercase tracking-[3px]">
        Font
      </Text>

      <View className="gap-2 pb-8">
        {FONTS.map((f) => {
          const selected = f.key === fontKey;
          const preview = FONT_FAMILIES[f.key];
          return (
            <Pressable
              key={f.key}
              onPress={() => setFont(f.key)}
              style={{
                backgroundColor: selected ? c.surfaceContainerHigh : c.surfaceContainer,
              }}
              className="flex-row items-center rounded-xl px-4 py-4">
              <View className="flex-1">
                <Text
                  style={{ fontFamily: preview.bold, color: c.onSurface }}
                  className="mb-0.5 text-lg">
                  {f.label}
                </Text>
                <Text
                  style={{ fontFamily: preview.regular, color: c.onSurfaceVariant }}
                  className="text-sm">
                  The quick brown fox jumps over the lazy dog
                </Text>
              </View>

              {selected && (
                <View
                  style={{ backgroundColor: c.primary }}
                  className="ml-3 h-5 w-5 items-center justify-center rounded-full">
                  <Text style={{ color: c.onPrimary }} className="text-xs">
                    ✓
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
