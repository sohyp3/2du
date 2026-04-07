import { useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeStore, THEME_COLORS, FONT_FAMILIES } from '@/store/themeStore';

const TAB_ROUTES = ['/', '/calendar', '/settings'] as const;
const SWIPE_THRESHOLD = 50;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TabLayout() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const fontKey = useThemeStore((s) => s.fontKey);
  const zenMode = useThemeStore((s) => s.zenMode);
  const c = THEME_COLORS[themeKey];
  const fonts = FONT_FAMILIES[fontKey];
  const pathname = usePathname();
  const router = useRouter();

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const prevPath = useRef(pathname);

  // Animate on route change
  useEffect(() => {
    if (!zenMode || prevPath.current === pathname) {
      prevPath.current = pathname;
      return;
    }

    const prevIdx = TAB_ROUTES.indexOf(prevPath.current as (typeof TAB_ROUTES)[number]);
    const currIdx = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);
    const direction = currIdx > prevIdx ? 1 : -1;
    prevPath.current = pathname;

    // Start from the incoming side
    translateX.setValue(direction * SCREEN_WIDTH * 0.3);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pathname, zenMode, translateX, opacity]);

  const navigateRef = useRef<(dir: -1 | 1) => void>(() => {});
  navigateRef.current = (direction: -1 | 1) => {
    const currentIdx = TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]);
    if (currentIdx === -1) return;
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= TAB_ROUTES.length) return;
    router.replace(TAB_ROUTES[nextIdx]);
  };

  const panX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderMove: Animated.event([null, { dx: panX }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          navigateRef.current(-1);
        } else if (g.dx < -SWIPE_THRESHOLD) {
          navigateRef.current(1);
        }
        Animated.spring(panX, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...(zenMode ? panResponder.panHandlers : {})}>
      <Animated.View
        style={zenMode ? { flex: 1, transform: [{ translateX }], opacity } : { flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.outline,
            tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
            tabBarStyle: zenMode
              ? { display: 'none' }
              : {
                  backgroundColor: c.surfaceContainer,
                  borderTopColor: c.outlineVariant,
                },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Todos',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="checkbox-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              title: 'Calendar',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </Animated.View>
    </View>
  );
}
