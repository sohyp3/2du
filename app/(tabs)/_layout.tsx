import { useWindowDimensions, View, Text } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
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
export default function TabLayout() {
  const desktop = useWindowDimensions().width >= 1000;
  const c = useColors(),
    fonts = useFontFamily(),
    router = useRouter(),
    pathname = usePathname();
  const { calendars, selected, select } = useCalendarsStore();
  const connected = useSyncStore((s) => !!s.token),
    syncError = useSyncStore((s) => s.error);
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.surface }}>
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
              color={syncError ? c.error : c.primary}
            />
            <Text style={{ fontFamily: fonts.regular, color: c.onSurfaceVariant, fontSize: 12 }}>
              {syncError
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
            animation: 'none',
            sceneStyle: { backgroundColor: c.surface },
            headerShown: false,
            tabBarActiveTintColor: c.primary,
            tabBarInactiveTintColor: c.onSurfaceVariant,
            tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
            tabBarStyle: desktop
              ? { display: 'none' }
              : {
                  backgroundColor: c.surfaceDim,
                  borderTopColor: c.outlineVariant,
                  paddingTop: 8,
                  height: 78,
                  paddingBottom: 12,
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
                tabBarIcon: ({ color }) => <Ionicons name={r.icon} color={color} size={22} />,
              }}
            />
          ))}
        </Tabs>
      </View>
    </View>
  );
}
