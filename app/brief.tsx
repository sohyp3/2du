import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { useBriefStore } from '@/store/briefStore';
import { useSyncStore } from '@/store/syncStore';
import { localDateKey } from '@/shared/localDate';
import { isRtlText } from '@/shared/textDirection';
import { useColors, useFontFamily } from '@/utils/theme';
import { buildMarkdownStyles } from '@/utils/markdownStyles';
import { PressFeedback } from '@/components/PressFeedback';

export default function BriefScreen() {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const today = useBriefStore((s) => s.today);
  const recent = useBriefStore((s) => s.recent);
  const connected = useSyncStore((s) => !!s.token);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = (picked && recent.find((b) => b.id === picked)) || today;
  const earlier = recent.filter((b) => b.id !== today?.id);
  const rtl = isRtlText(shown?.content);
  const markdownStyles = useMemo(() => {
    const styles = buildMarkdownStyles(
      {
        ink: c.onSurface,
        muted: c.onSurfaceVariant,
        rule: c.outlineVariant,
        link: c.primary,
        codeBg: c.surfaceContainer,
      },
      fonts
    );
    if (!rtl) return styles;
    const align = { textAlign: 'right', writingDirection: 'rtl' } as const;
    return {
      ...styles,
      body: { ...styles.body, ...align },
      heading1: { ...styles.heading1, ...align },
      heading2: { ...styles.heading2, ...align },
      heading3: { ...styles.heading3, ...align },
      paragraph: align,
      textgroup: align,
      bullet_list_content: { flex: 1, ...align },
      ordered_list_content: { flex: 1, ...align },
    };
  }, [c, fonts, rtl]);

  const refresh = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await useSyncStore.getState().request('brief', { method: 'POST', body: '{}' });
      setPicked(null);
      await useSyncStore.getState().sync();
    } catch (e) {
      setError(
        (e as { status?: number }).status === 429
          ? "You've refreshed a lot. Try again later."
          : e instanceof Error
            ? e.message
            : 'Could not write the brief'
      );
    } finally {
      setBusy(false);
    }
  };

  const action = (label: string, onPress: () => void) => (
    <PressFeedback
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
      <Text style={{ color: c.primary, fontFamily: fonts.medium, fontSize: 14 }}>{label}</Text>
    </PressFeedback>
  );
  const note = (text: string) => (
    <Text
      style={{
        color: c.onSurfaceVariant,
        fontFamily: fonts.regular,
        fontSize: 14,
        lineHeight: 20,
      }}>
      {text}
    </Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surface }}
      contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.medium, fontSize: 13 }}>
            {shown?.date ?? localDateKey(new Date())}
          </Text>
          {busy ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            connected && shown && action('Refresh', refresh)
          )}
        </View>
        {error && (
          <Text style={{ color: c.error, fontFamily: fonts.regular, fontSize: 13, marginTop: 6 }}>
            {error}
          </Text>
        )}
        {shown ? (
          <View style={{ marginTop: 8, direction: rtl ? 'rtl' : 'ltr' }}>
            <Markdown style={markdownStyles}>{shown.content}</Markdown>
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 8, alignItems: 'flex-start' }}>
            {connected ? (
              <>
                {note('No brief yet today.')}
                {action('Write it now', refresh)}
              </>
            ) : (
              <>
                {note('Connect to your sync server to get a daily brief.')}
                {action('Connect', () =>
                  router.push({ pathname: '/settings', params: { tab: 'sync' } })
                )}
              </>
            )}
          </View>
        )}
        {earlier.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <Text style={{ color: c.onSurface, fontFamily: fonts.medium, fontSize: 14 }}>
              Earlier
            </Text>
            {earlier.map((b) => (
              <PressFeedback
                key={b.id}
                accessibilityRole="button"
                onPress={() => setPicked(b.id)}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: c.outlineVariant,
                }}>
                <Text
                  style={{
                    color: picked === b.id ? c.primary : c.onSurface,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                  }}>
                  {b.date}
                </Text>
              </PressFeedback>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
