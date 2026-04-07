import { useState } from 'react';
import { Text, View, Pressable, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { useThemeStore, THEMES, FONTS, FONT_FAMILIES } from '@/store/themeStore';
import { useColors, useFontFamily } from '@/utils/theme';
import { useCalendarStore } from '@/store/calendarStore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const fontKey = useThemeStore((s) => s.fontKey);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setFont = useThemeStore((s) => s.setFont);
  const isPlus = useThemeStore((s) => s.isPlus);
  const setIsPlus = useThemeStore((s) => s.setIsPlus);
  const zenMode = useThemeStore((s) => s.zenMode);
  const setZenMode = useThemeStore((s) => s.setZenMode);
  const [showPlusPrompt, setShowPlusPrompt] = useState(false);
  const [plusPassword, setPlusPassword] = useState('');
  const dayViewStartHour = useCalendarStore((s) => s.dayViewStartHour);
  const setDayViewStartHour = useCalendarStore((s) => s.setDayViewStartHour);
  const timeFormat = useCalendarStore((s) => s.timeFormat);
  const setTimeFormat = useCalendarStore((s) => s.setTimeFormat);
  const c = useColors();
  const fonts = useFontFamily();
  const router = useRouter();

  const formatHour = (h: number) => {
    if (timeFormat === '24h') {
      return `${String(h).padStart(2, '0')}:00`;
    }
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    if (h < 12) return `${h} AM`;
    return `${h - 12} PM`;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      className="px-5 pt-14"
      contentContainerStyle={{ paddingBottom: 120 }}>
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

      <Text
        style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
        className="mb-3 text-xs uppercase tracking-[3px]">
        Calendar
      </Text>

      <View style={{ backgroundColor: c.surfaceContainer }} className="mb-4 rounded-xl p-4">
        <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="mb-3 text-sm">
          Time Format
        </Text>
        <View className="flex-row gap-2">
          {(['12h', '24h'] as const).map((f) => {
            const selected = f === timeFormat;
            return (
              <Pressable
                key={f}
                onPress={() => setTimeFormat(f)}
                style={{
                  backgroundColor: selected ? c.primary : c.surfaceContainerHigh,
                }}
                className="flex-1 rounded-lg py-2">
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    color: selected ? c.onPrimary : c.onSurface,
                  }}
                  className="text-center text-sm">
                  {f === '12h' ? '12 Hour' : '24 Hour'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text
        style={{ fontFamily: fonts.medium, color: c.onSurfaceVariant }}
        className="mb-3 text-xs uppercase tracking-[3px]">
        Plus
      </Text>

      <View style={{ backgroundColor: c.surfaceContainer }} className="mb-8 rounded-xl p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-sm">
                Zen Mode
              </Text>
              {!isPlus && (
                <View style={{ backgroundColor: c.primaryContainer }} className="rounded-md px-2 py-0.5">
                  <Text style={{ fontFamily: fonts.medium, color: c.primary }} className="text-[10px]">
                    PLUS
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant }}
              className="mt-1 text-xs">
              Hide tabs and swipe to navigate
            </Text>
          </View>
          <Switch
            value={zenMode}
            onValueChange={(v) => {
              if (!isPlus) return;
              setZenMode(v);
              if (v) router.replace('/');
            }}
            disabled={!isPlus}
            trackColor={{ false: c.outlineVariant, true: c.primary }}
            thumbColor={zenMode ? c.onPrimary : c.surfaceContainerHighest}
          />
        </View>
      </View>

      <View style={{ backgroundColor: c.surfaceContainer }} className="mb-8 rounded-xl p-4">
        <View className="mb-2 flex-row justify-between">
          <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-sm">
            Day View Start Hour
          </Text>
          <Text style={{ fontFamily: fonts.bold, color: c.primary }} className="text-sm">
            {formatHour(dayViewStartHour)}
          </Text>
        </View>
        <View className="h-8 flex-row items-center">
          <Pressable
            onPress={() => setDayViewStartHour(Math.max(0, dayViewStartHour - 1))}
            className="w-8 items-center justify-center">
            <Text style={{ color: c.primary }} className="text-xl font-bold">
              ‹
            </Text>
          </Pressable>
          <View className="flex-1 flex-row items-center justify-center px-2">
            <View style={{ backgroundColor: c.outlineVariant }} className="h-1 flex-1 rounded-full">
              <View
                style={{
                  backgroundColor: c.primary,
                  width: `${((dayViewStartHour + 1) / 24) * 100}%`,
                }}
                className="absolute -top-1 h-3 rounded-full"
              />
            </View>
          </View>
          <Pressable
            onPress={() => setDayViewStartHour(Math.min(23, dayViewStartHour + 1))}
            className="w-8 items-center justify-center">
            <Text style={{ color: c.primary }} className="text-xl font-bold">
              ›
            </Text>
          </Pressable>
        </View>
      </View>

      {!isPlus && !showPlusPrompt && (
        <Pressable
          onPress={() => setShowPlusPrompt(true)}
          style={{ backgroundColor: c.primary }}
          className="mb-4 items-center rounded-2xl py-4">
          <Text style={{ fontFamily: fonts.bold, color: c.onPrimary }} className="text-base">
            Activate Plus
          </Text>
        </Pressable>
      )}

      {!isPlus && showPlusPrompt && (
        <View style={{ backgroundColor: c.surfaceContainer }} className="mb-4 rounded-2xl p-4">
          <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="mb-3 text-sm">
            Enter activation code
          </Text>
          <TextInput
            value={plusPassword}
            onChangeText={setPlusPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={c.outline}
            style={{
              fontFamily: fonts.regular,
              color: c.onSurface,
              backgroundColor: c.surfaceContainerHigh,
            }}
            className="mb-3 rounded-xl px-4 py-3 text-sm"
          />
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => {
                setShowPlusPrompt(false);
                setPlusPassword('');
              }}
              style={{ backgroundColor: c.surfaceContainerHigh }}
              className="flex-1 items-center rounded-xl py-3">
              <Text style={{ fontFamily: fonts.medium, color: c.onSurface }} className="text-sm">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (plusPassword === 'hehe') {
                  setIsPlus(true);
                  setShowPlusPrompt(false);
                  setPlusPassword('');
                } else {
                  Alert.alert('Wrong code', 'That activation code is incorrect.');
                  setPlusPassword('');
                }
              }}
              style={{ backgroundColor: c.primary }}
              className="flex-1 items-center rounded-xl py-3">
              <Text style={{ fontFamily: fonts.bold, color: c.onPrimary }} className="text-sm">
                Activate
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {isPlus && (
        <View className="mb-4 items-center py-4">
          <Text style={{ fontFamily: fonts.medium, color: c.primary }} className="text-sm">
            Plus is active
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
