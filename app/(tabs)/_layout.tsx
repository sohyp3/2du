import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  useWindowDimensions,
  View,
  Text,
  type ViewStyle,
} from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useThemeStore } from '@/store/themeStore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DISPLAY_FONT, radius, space, type, useColors, useFontFamily } from '@/utils/theme';
import { contrastText } from '@/utils/palette';
import { useCalendarsStore } from '@/store/calendarsStore';
import { PressFeedback } from '@/components/PressFeedback';
import { SyncChip } from '@/components/SyncChip';

// Order drives the tab bar, the desktop sidebar and zen-mode swipes.
const routes = [
  { name: 'index', path: '/', label: 'Tasks', icon: 'checkmark-circle' },
  { name: 'calendar', path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'goals', path: '/goals', label: 'Goals', icon: 'flag' },
  { name: 'notes', path: '/notes', label: 'Notes & thoughts', icon: 'document-text' },
  { name: 'settings', path: '/settings', label: 'Settings', icon: 'options' },
] as const;
type Route = (typeof routes)[number];
// The active destination gets the filled glyph, the rest stay outlined.
const iconFor = (r: Route, active: boolean) =>
  (active ? r.icon : `${r.icon}-outline`) as `${Route['icon']}` | `${Route['icon']}-outline`;
const SWIPE_DISTANCE = 60;

const BAR_HEIGHT = 64;
/** Bottom space a phone screen needs so the floating tab bar never covers its content. */
export const TAB_BAR_SPACE = BAR_HEIGHT + 24;
const ADD_SIZE = 56;
const ICON_SLOT = 44;
const LABEL_GAP = 6;
const SPRING = { damping: 18, stiffness: 260, mass: 0.8 };

// Phone tab bar slots: two tabs, the add button, two tabs.
const barTabs = ['index', 'calendar', 'goals', 'notes'] as const;
const barLabel = (r: Route) => (r.name === 'notes' ? 'Notes' : r.label);

/** One phone tab: icon only, or icon and label in a soft pill when active. */
function BarTab({
  route,
  active,
  labelWidth,
  maxWidth,
  onPress,
}: {
  route: Route;
  active: boolean;
  labelWidth: number;
  maxWidth: number;
  onPress: () => void;
}) {
  const c = useColors(),
    fonts = useFontFamily();
  const reduced = useReducedMotion();
  const target =
    active && labelWidth
      ? Math.min(ICON_SLOT + LABEL_GAP + labelWidth + space.xs, maxWidth)
      : ICON_SLOT;
  const width = useSharedValue(target);
  useEffect(() => {
    width.value = reduced ? target : withSpring(target, SPRING);
  }, [target, reduced, width]);
  const animated = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <PressFeedback
      haptic="select"
      accessibilityRole="tab"
      accessibilityLabel={barLabel(route)}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10 }}>
      <Animated.View
        style={[
          {
            height: ICON_SLOT,
            borderRadius: radius.pill,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: (ICON_SLOT - 22) / 2,
            overflow: 'hidden',
            backgroundColor: active ? c.accentSoft : 'transparent',
          },
          animated,
        ]}>
        <Ionicons
          name={iconFor(route, active)}
          size={22}
          color={active ? c.primary : c.onSurfaceVariant}
        />
        {active && (
          <Text
            numberOfLines={1}
            style={{
              marginLeft: LABEL_GAP,
              flexShrink: 0,
              fontFamily: fonts.bold,
              color: c.primary,
              ...type.label,
            }}>
            {barLabel(route)}
          </Text>
        )}
      </Animated.View>
    </PressFeedback>
  );
}

/** The phone tab bar: a floating pill with a raised add button in the middle. */
function FloatingTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter();
  const width = useWindowDimensions().width;
  const [labels, setLabels] = useState<Record<string, number>>({});
  const current = state.routes[state.index]?.name;
  // The active tab grows into whatever the other slots leave free.
  const inner = width - space.lg * 2 - space.sm * 2;
  const maxTab = Math.max(ICON_SLOT, inner - ICON_SLOT * 3 - ADD_SIZE - space.xs * 6);
  const shadow: ViewStyle = Platform.select<ViewStyle>({
    web: { boxShadow: `0 8px 24px ${c.shadow}` },
    android: { elevation: 8, shadowColor: c.shadow },
    default: {
      shadowColor: c.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  });
  const tab = (name: (typeof barTabs)[number]) => {
    const r = routes.find((x) => x.name === name)!;
    const route = state.routes.find((x) => x.name === name);
    return (
      <BarTab
        key={name}
        route={r}
        active={current === name}
        labelWidth={labels[name] ?? 0}
        maxWidth={maxTab}
        onPress={() => {
          if (!route) return;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (current !== name && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      />
    );
  };
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: space.lg,
        right: space.lg,
        bottom: insets.bottom + space.md,
      }}>
      {/* Measures each label once so the active pill can spring to the right width. */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', opacity: 0, alignItems: 'flex-start' }}>
        {barTabs.map((name) => (
          <Text
            key={name}
            numberOfLines={1}
            onLayout={(e) => {
              const w = Math.ceil(e.nativeEvent.layout.width);
              setLabels((l) => (l[name] === w ? l : { ...l, [name]: w }));
            }}
            style={{ fontFamily: fonts.bold, ...type.label }}>
            {barLabel(routes.find((x) => x.name === name)!)}
          </Text>
        ))}
      </View>
      <View
        accessibilityRole="tablist"
        style={{
          height: BAR_HEIGHT,
          borderRadius: radius.pill,
          backgroundColor: c.surfaceContainerLow,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: space.sm,
          ...shadow,
        }}>
        {barTabs.slice(0, 2).map(tab)}
        <View style={{ width: ADD_SIZE, alignItems: 'center' }}>
          <PressFeedback
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel="New task"
            onPress={() => router.push('/add-todo')}
            style={{
              width: ADD_SIZE,
              height: ADD_SIZE,
              borderRadius: ADD_SIZE / 2,
              marginTop: -space.md * 2,
              backgroundColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: c.surfaceContainerLow,
              ...shadow,
            }}>
            <Ionicons name="add" size={30} color={c.onPrimary} />
          </PressFeedback>
        </View>
        {barTabs.slice(2).map(tab)}
      </View>
    </View>
  );
}
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
            width: 248,
            backgroundColor: c.surfaceContainerLow,
            borderRightWidth: 1,
            borderRightColor: c.outlineVariant,
            paddingHorizontal: space.lg,
            paddingTop: space.xxl,
            paddingBottom: space.xl,
          }}>
          <Text
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: 28,
              lineHeight: 34,
              color: c.onSurface,
              letterSpacing: -0.8,
              paddingHorizontal: space.sm,
            }}>
            2du<Text style={{ color: c.primary }}>.</Text>
          </Text>
          <PressFeedback
            haptic="tap"
            accessibilityRole="link"
            onPress={() => router.push('/add-todo')}
            style={{
              marginTop: space.xl,
              marginBottom: space.xl,
              minHeight: 48,
              borderRadius: radius.pill,
              backgroundColor: c.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
            }}>
            <Ionicons name="add" size={22} color={c.onPrimary} />
            <Text style={{ fontFamily: fonts.bold, color: c.onPrimary, ...type.body }}>
              New task
            </Text>
          </PressFeedback>
          <View style={{ gap: space.xs }}>
            {routes.map((r) => {
              const active = pathname === r.path;
              return (
                <PressFeedback
                  key={r.name}
                  accessibilityRole="link"
                  accessibilityState={{ selected: active }}
                  onPress={() => router.navigate(r.path)}
                  style={{
                    height: 44,
                    paddingHorizontal: space.md,
                    borderRadius: radius.pill,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: active ? c.accentSoft : 'transparent',
                  }}>
                  <Ionicons
                    name={iconFor(r, active)}
                    color={active ? c.primary : c.onSurfaceVariant}
                    size={20}
                  />
                  <Text
                    style={{
                      fontFamily: active ? fonts.bold : fonts.medium,
                      ...type.label,
                      fontSize: 14,
                      color: active ? c.primary : c.onSurface,
                    }}>
                    {r.label}
                  </Text>
                </PressFeedback>
              );
            })}
          </View>
          <Text
            style={{
              color: c.onSurfaceVariant,
              fontFamily: fonts.bold,
              ...type.caption,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginTop: space.xxl,
              marginBottom: space.sm,
              paddingHorizontal: space.md,
            }}>
            Calendars
          </Text>
          <View style={{ gap: space.xs }}>
            {calendars.map((item) => {
              const active = selected === item.id;
              const ink = contrastText(item.color);
              return (
                <PressFeedback
                  key={item.id}
                  haptic="select"
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    select(active ? null : item.id);
                    router.navigate('/');
                  }}
                  style={{
                    flexDirection: 'row',
                    gap: space.md,
                    alignItems: 'center',
                    minHeight: 40,
                    paddingHorizontal: space.md,
                    backgroundColor: active ? item.color : 'transparent',
                    borderRadius: radius.pill,
                  }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: active ? ink : item.color,
                    }}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: active ? ink : c.onSurface,
                      fontFamily: active ? fonts.bold : fonts.regular,
                      ...type.label,
                      flex: 1,
                    }}>
                    {item.name}
                  </Text>
                </PressFeedback>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <SyncChip />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          tabBar={(props) => (desktop || swipeTabs ? null : <FloatingTabBar {...props} />)}
          screenOptions={{
            animation: swipeTabs && !reducedMotion ? 'shift' : 'none',
            // Hidden tabs stop re-rendering while another tab is in front.
            freezeOnBlur: true,
            sceneStyle: {
              backgroundColor: c.surface,
              // Keep content clear of the floating bar, or of the home indicator in zen mode.
              paddingBottom: desktop ? 0 : insets.bottom + (swipeTabs ? 0 : TAB_BAR_SPACE),
            },
            headerShown: false,
          }}>
          <Tabs.Screen name="sync" options={{ href: null }} />
          {routes.map((r) => (
            <Tabs.Screen key={r.name} name={r.name} options={{ title: r.label }} />
          ))}
        </Tabs>
      </View>
    </View>
  );
}
