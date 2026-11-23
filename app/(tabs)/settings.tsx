import { Fragment, useEffect } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { HeaderAction, ScreenHeader } from '@/components/ScreenHeader';
import { SettingsRow } from '@/components/settings/SettingsRow';
import {
  findSection,
  SECTIONS,
  sectionColor,
  type Section,
  type SectionKey,
} from '@/components/settings/sections';
import { DISPLAY_FONT, radius, space, useColors } from '@/utils/theme';

export default function SettingsScreen() {
  const { section, tab } = useLocalSearchParams<{ section?: string; tab?: string }>();
  // Old links used `?tab=sync` and `?tab=general`.
  const open = findSection(section ?? (tab === 'sync' ? 'account' : undefined));
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const desktop = useWindowDimensions().width >= 1000;

  const select = (key: SectionKey | undefined) =>
    router.setParams({ section: key, tab: undefined });

  useEffect(() => {
    if (desktop || !open || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      select(undefined);
      return true;
    });
    return () => sub.remove();
  });

  const top = Platform.OS === 'web' ? space.xl : insets.top + space.md;

  const row = (s: Section) => (
    <SettingsRow
      label={s.label}
      hint={s.hint}
      icon={s.icon}
      iconColor={sectionColor(s, c)}
      onPress={() => select(s.key)}
      right={
        desktop ? undefined : (
          <Ionicons name="chevron-forward" size={20} color={c.onSurfaceVariant} />
        )
      }
    />
  );

  const title = (s: Section) => (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: DISPLAY_FONT,
        fontSize: 28,
        lineHeight: 34,
        color: c.onSurface,
        flex: desktop ? undefined : 1,
      }}>
      {s.label}
    </Text>
  );

  if (desktop) {
    const current = open ?? SECTIONS[0];
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.surface }}>
        <ScrollView
          style={{ width: 280, flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingTop: top,
            paddingBottom: space.xl,
          }}>
          <ScreenHeader title="Settings" inset={false} />
          <View style={{ gap: space.xs }}>
            {SECTIONS.map((s) => {
              const selected = s.key === current.key;
              return (
                <View
                  key={s.key}
                  accessibilityState={{ selected }}
                  style={{
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    backgroundColor: selected ? c.accentSoft : 'transparent',
                  }}>
                  {row(s)}
                </View>
              );
            })}
          </View>
        </ScrollView>
        <ScrollView
          key={current.key}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: space.xl,
            paddingTop: top,
            paddingBottom: space.xxl,
            maxWidth: 720,
            width: '100%',
          }}>
          <View style={{ marginBottom: space.xl }}>{title(current)}</View>
          <current.Component />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      key={open?.key ?? 'list'}
      style={{ flex: 1, backgroundColor: c.surface }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: top,
        paddingBottom: 120,
      }}>
      {open ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              marginBottom: space.xl,
            }}>
            <HeaderAction
              icon="arrow-back"
              label="Back to settings"
              onPress={() => select(undefined)}
            />
            {title(open)}
          </View>
          <open.Component />
        </>
      ) : (
        <>
          <ScreenHeader title="Settings" emoji="⚙️" inset={false} />
          <Card padded={false}>
            {SECTIONS.map((s, i) => (
              <Fragment key={s.key}>
                {i > 0 && (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: c.outlineVariant,
                      marginLeft: space.lg + 32 + space.md,
                    }}
                  />
                )}
                {row(s)}
              </Fragment>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
