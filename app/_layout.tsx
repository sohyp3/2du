import '../global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import { initDatabase } from '@/db/database';
import { setupNotifications, snoozeTodoReminder } from '@/utils/notifications';
import { getTodoById } from '@/db/todos';
import { useTodoStore } from '@/store/todoStore';
import { useThemeStore, THEME_COLORS } from '@/store/themeStore';

export default function Layout() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const loadSettings = useThemeStore((s) => s.loadSettings);
  const { setColorScheme } = useColorScheme();
  const c = THEME_COLORS[themeKey];

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_700Bold,
  });

  useEffect(() => {
    initDatabase();
    setupNotifications();
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setColorScheme(themeKey === 'gold' ? 'dark' : 'light');
  }, [themeKey, setColorScheme]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      const todoId = response.notification.request.content.data?.todoId as string | undefined;
      if (!todoId) return;

      if (action === 'mark-done') {
        useTodoStore.getState().toggleComplete(todoId);
        return;
      }

      const snoozeMap: Record<string, number> = {
        'snooze-5': 5,
        'snooze-10': 10,
        'snooze-30': 30,
      };
      const minutes = snoozeMap[action];
      if (minutes) {
        const todo = getTodoById(todoId);
        if (todo) snoozeTodoReminder(todo, minutes);
      }
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surface,
        }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surfaceDim },
          headerTintColor: c.primary,
          headerTitleStyle: { color: c.onSurface },
          contentStyle: { backgroundColor: c.surface },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-todo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="todo/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
