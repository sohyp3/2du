import { useMemo, useRef } from 'react';
import { PanResponder, useWindowDimensions, View, Text } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useThemeStore } from '@/store/themeStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColors, useFontFamily } from '@/utils/theme';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useSyncStore } from '@/store/syncStore';
import { PressFeedback } from '@/components/PressFeedback';
const routes = [
  { name: 'index', path: '/', label: 'Tasks', icon: 'checkmark-circle-outline' },
  { name: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar-outline' },
  { name: 'notes', path: '/notes', label: 'Notes & thoughts', icon: 'document-text-outline' },
  { name: 'settings', path: '/settings', label: 'Settings', icon: 'options-outline' },
] as const;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.3;
export default function TabLayout() {
  const desktop = useWindowDimensions().width >= 1000;
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter(),
    pathname = usePathname();
  const calendars = useCalendarsStore((s) => s.calendars),
    selected = useCalendarsStore((s) => s.selected),
    select = useCalendarsStore((s) => s.select);
  const connected = useSyncStore((s) => !!s.token),
    syncError = useSyncStore((s) => s.error),
    needsLogin = useSyncStore((s) => s.needsLogin);
  const zenMode = useThemeStore((s) => s.zenMode);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  // Zen mode on phones: no tab bar, swipe horizontally to move between tabs.
  const swipeTabs = zenMode && !desktop;

  // PanResponder callbacks are created once, so read live values through a ref.
  const live = useRef({ swipeTabs, pathname, router });
  live.current = { swipeTabs, pathname, router };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          live.current.swipeTabs && Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, g) => {
          const { swipeTabs: enabled, pathname: path, router: nav } = live.current;
          if (!enabled) return;
          const far = Math.abs(g.dx) > SWIPE_DISTANCE || Math.abs(g.vx) > SWIPE_VELOCITY;
          if (!far || Math.abs(g.dx) < 20) return;
          const index = routes.findIndex((r) => r.path === path);
          if (index === -1) return;
          const next = routes[index + (g.dx < 0 ? 1 : -1)];
          if (next) nav.navigate(next.path);
        },
      }),
    []
  );
  return (
    <View
      style={{ flex: 1, flexDirection: 'row', backgroundColor: c.surface }}
      {...(swipeTabs ? panResponder.panHandlers : {})}>
      {desktop && (
        <View
          style={{
            width: 240,
            backgroundColor: c.surfaceDim,
            borderRightWidth: 1,
            borderRightColor: c.outlineVariant,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 24,
          }}>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_500Medium',
              fontSize: 38,
              color: c.onSurface,
              letterSpacing: -1,
            }}>
            2du<Text style={{ color: c.primary }}>.</Text>
          </Text>
          <Text
            style={{
              color: c.onSurfaceVariant,
              fontFamily: fonts.regular,
              fontSize: 12,
              marginTop: 4,
              marginBottom: 46,
            }}>
            A little more intentional.
          </Text>
          <View style={{ gap: 6 }}>
            {routes.map((r) => (
              <PressFeedback
                key={r.name}
                accessibilityRole="link"
                onPress={() => router.navigate(r.path)}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: pathname === r.path ? c.surfaceContainerHigh : 'transparent',
                }}>
                <Ionicons
                  name={r.icon}
                  color={pathname === r.path ? c.primary : c.onSurfaceVariant}
                  size={20}
                />
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 14,
                    color: pathname === r.path ? c.onSurface : c.onSurfaceVariant,
                  }}>
                  {r.label}
                </Text>
              </PressFeedback>
            ))}
          </View>
          <Text
            style={{
              color: c.onSurfaceVariant,
              fontFamily: fonts.medium,
              fontSize: 12,
              marginTop: 42,
              marginBottom: 12,
            }}>
            Your calendars
          </Text>
          {calendars.map((item) => (
            <PressFeedback
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                select(selected === item.id ? null : item.id);
                router.navigate('/');
              }}
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
                minHeight: 44,
                paddingHorizontal: 12,
                backgroundColor: selected === item.id ? c.surfaceContainerHigh : 'transparent',
                borderRadius: 8,
              }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <Text style={{ color: c.onSurfaceVariant, fontFamily: fonts.regular, flex: 1 }}>
                {item.name}
              </Text>
            </PressFeedback>
          ))}
          <View style={{ flex: 1 }} />
          <PressFeedback
            accessibilityRole="button"
            onPress={() => router.navigate({ pathname: '/settings', params: { tab: 'sync' } })}
            style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons
              name={connected ? 'cloud-done-outline' : 'phone-portrait-outline'}
              size={18}
              color={needsLogin || syncError ? c.error : c.primary}
            />
            <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 }}>
              {needsLogin
                ? 'Sign in again to sync'
                : syncError
                  ? 'Sync needs attention'
                  : connected
                    ? 'Sync connected'
                    : 'Saved on this device'}
            </Text>
          </PressFeedback>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          screenOptions={{
            animation: swipeTabs && !reducedMotion ? 'shift' : 'none',
            // Hidden tabs stop re-rendering while another tab is in front.
            freezeOnBlur: true,
            sceneStyle: {
              backgroundColor: c.surface,
              paddingBottom: swipeTabs ? insets.bottom : 0,
            },
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.onSurfaceVariant,
            tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
            tabBarStyle:
              desktop || swipeTabs
                ? { display: 'none' }
                : {
                    backgroundColor: c.surfaceDim,
                    borderTopColor: c.outlineVariant,
                    paddingTop: 6,
                    // Keep labels clear of the Android navigation bar / iOS home indicator.
                    height: 56 + Math.max(8, insets.bottom),
                    paddingBottom: Math.max(8, insets.bottom),
                  },
          }}>
          <Tabs.Screen name="sync" options={{ href: null }} />
          {routes.map((r) => (
            <Tabs.Screen
              key={r.name}
              name={r.name}
              options={{
                title: r.label,
                tabBarLabel: r.name === 'notes' ? 'Notes' : r.label,
                tabBarIcon: ({ color }) => <Ionicons name={r.icon} color={color} size={20} />,
              }}
            />
          ))}
        </Tabs>
      </View>
    </View>
  );
}
