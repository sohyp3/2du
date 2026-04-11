import '../global.css';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
import { initDatabase, DatabaseError } from '@/db/database';
import { getTodoById } from '@/db/todos';
import { setupNotifications, snoozeTodoReminder } from '@/utils/notifications';
import { useTodoStore } from '@/store/todoStore';
import { useThemeStore, THEME_COLORS } from '@/store/themeStore';
import { useCalendarStore } from '@/store/calendarStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Layout() {
  const themeKey = useThemeStore((s) => s.themeKey);
  const loadSettings = useThemeStore((s) => s.loadSettings);
  const loadCalendarSettings = useCalendarStore((s) => s.loadSettings);
  const { setColorScheme } = useColorScheme();
  const c = THEME_COLORS[themeKey];

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

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
    async function initialize() {
      try {
        setIsInitializing(true);
        setInitError(null);

        // Initialize database first
        await initDatabase();

        // Then setup other services in parallel
        await Promise.all([
          setupNotifications(),
          loadSettings(),
          loadCalendarSettings(),
          useTodoStore.getState().loadSettings(),
        ]);

        setIsInitializing(false);
      } catch (error) {
        const message =
          error instanceof DatabaseError
            ? error.message
            : 'Failed to initialize app. Please try again.';
        setInitError(message);
        setIsInitializing(false);
        console.error('Initialization error:', error);
      }
    }

    initialize();
  }, [loadSettings, loadCalendarSettings]);

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
        getTodoById(todoId).then((todo) => {
          if (todo) snoozeTodoReminder(todo, minutes);
        });
      }
    });

    return () => sub.remove();
  }, []);

  // Show initialization loading state
  if (isInitializing || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surface,
        }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  // Show initialization error state
  if (initError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surface,
          padding: 24,
        }}>
        <Text
          style={{
            fontFamily: 'Inter_700Bold',
            color: c.onSurface,
            fontSize: 24,
            marginBottom: 12,
            textAlign: 'center',
          }}>
          Failed to Start
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            color: c.onSurfaceVariant,
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 24,
          }}>
          {initError}
        </Text>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
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
          <Stack.Screen name="note/[id]" options={{ presentation: 'card', headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
