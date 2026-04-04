import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeStore, THEME_COLORS, FONT_FAMILIES } from '@/store/themeStore';

export default function TabLayout() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const fontKey = useThemeStore((s) => s.fontKey);
  const c = THEME_COLORS[themeKey];
  const fonts = FONT_FAMILIES[fontKey];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.outline,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
        tabBarStyle: {
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
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
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
  );
}
