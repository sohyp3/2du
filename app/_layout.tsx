import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useNoteStore } from '@/store/noteStore';
import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startSync } from '@/store/syncStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useGoalStore } from '@/store/goalStore';
import { useBriefStore } from '@/store/briefStore';
import { useReducedMotion } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
// Per-weight imports: the package roots pull every weight into the build (14 MB on web).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond/700Bold';
import { initDatabase, DatabaseError } from '@/db/database';
import { getTodoById } from '@/db/todos';
import { setupNotifications, snoozeTodoReminder } from '@/utils/notifications';
import { useTodoStore } from '@/store/todoStore';
import { useThemeStore, THEME_COLORS } from '@/store/themeStore';
import { useCalendarStore } from '@/store/calendarStore';
import { AppTitle } from '@/components/AppTitle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { preloadTing } from '@/utils/ting';
import { registerServiceWorker } from '@/utils/pwa';
import { DATABASE_LOCKED } from '@/db/initializationError';

const LOCK_RELOAD_KEY = '2du-lock-reload';

export default function Layout() {
  return (
    <>
      <AppTitle />
      <App />
    </>
  );
}

function App() {
  const reducedMotion = useReducedMotion();
  const themeKey = useThemeStore((s) => s.themeKey);
  const loadSettings = useThemeStore((s) => s.loadSettings);
  const loadCalendarSettings = useCalendarStore((s) => s.loadSettings);
  const { setColorScheme } = useColorScheme();
  const c = THEME_COLORS[themeKey];

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);

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

  // Startup timing, logged once in development. `fonts` is measured from the start of
  // database init, since both begin on mount and run in parallel.
  const startup = useRef<{ db: number; settings: number; start: number } | null>(null);
  const fontsAt = useRef(0);
  if (fontsLoaded && !fontsAt.current) fontsAt.current = performance.now();

  useEffect(() => {
    async function initialize() {
      try {
        setIsInitializing(true);
        setInitError(null);

        // Initialize database first
        const t0 = performance.now();
        await initDatabase();
        const t1 = performance.now();
        if (Platform.OS === 'web') sessionStorage.removeItem(LOCK_RELOAD_KEY);

        // Only what the first frame needs; everything else can finish after it paints.
        await Promise.all([
          loadSettings(),
          loadCalendarSettings(),
          useCalendarsStore.getState().load(),
          // The period filter must be known before the first task query.
          useTodoStore
            .getState()
            .loadSettings()
            .then(() => useTodoStore.getState().loadTodos()),
        ]);
        startup.current = { db: t1 - t0, settings: performance.now() - t1, start: t0 };

        setIsInitializing(false);

        // Notifications and the note list are not needed to paint the UI. Notes still
        // load right away (a note deep link may need them) but off the startup path;
        // the Notes tab loads its own copy when opened.
        void setupNotifications().catch((error) =>
          console.error('Notification setup failed:', error)
        );
        void useNoteStore.getState().loadNotes();
        void useGoalStore.getState().load();
        void useBriefStore.getState().load();
      } catch (error) {
        // A reload can race the previous page's SQLite worker for the file lock, and a
        // worker that lost that race stays unusable. Reload once before reporting it.
        if (
          Platform.OS === 'web' &&
          error instanceof DatabaseError &&
          error.originalError &&
          DATABASE_LOCKED.test(`${error.originalError.name}: ${error.originalError.message}`) &&
          !sessionStorage.getItem(LOCK_RELOAD_KEY)
        ) {
          sessionStorage.setItem(LOCK_RELOAD_KEY, '1');
          setTimeout(() => window.location.reload(), 600);
          return;
        }
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
  }, [loadSettings, loadCalendarSettings, initAttempt]);

  useEffect(() => {
    const s = startup.current;
    if (!__DEV__ || !s || !fontsLoaded || isInitializing) return;
    startup.current = null;
    console.log(
      `startup db=${s.db.toFixed(0)}ms settings=${s.settings.toFixed(0)}ms fonts=${(fontsAt.current - s.start).toFixed(0)}ms`
    );
  }, [fontsLoaded, isInitializing]);

  useEffect(() => {
    setColorScheme(themeKey === 'silver' ? 'light' : 'dark');
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

  useEffect(() => {
    if (!isInitializing && !initError) return startSync();
  }, [isInitializing, initError]);

  useEffect(() => {
    // Web browsers only allow audio after a user gesture, so load it lazily there.
    if (Platform.OS !== 'web') preloadTing();
    else registerServiceWorker();
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
        <PressFeedback
          accessibilityRole="button"
          onPress={() => {
            if (Platform.OS === 'web') window.location.reload();
            else setInitAttempt((attempt) => attempt + 1);
          }}
          style={{
            backgroundColor: c.primary,
            paddingHorizontal: 28,
            minHeight: 48,
            justifyContent: 'center',
            borderRadius: 10,
          }}>
          <Text style={{ color: c.onPrimary, fontFamily: 'Inter_500Medium', fontSize: 16 }}>
            Retry
          </Text>
        </PressFeedback>
      </View>
    );
  }

  const navigationTheme = themeKey === 'silver' ? DefaultTheme : DarkTheme;
  return (
    <ThemeProvider
      value={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: c.surface,
          card: c.surfaceDim,
          text: c.onSurface,
          border: c.outlineVariant,
          primary: c.primary,
        },
      }}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <Stack
              screenOptions={{
                // Android 13+'s system default transition runs 450ms; the iOS-style slide
                // is 200ms and feels much snappier. iOS keeps its native push.
                animation: reducedMotion
                  ? 'fade'
                  : Platform.OS === 'android'
                    ? 'ios_from_right'
                    : 'default',
                headerStyle: { backgroundColor: c.surfaceDim },
                headerTintColor: c.primary,
                headerTitleStyle: { color: c.onSurface },
                contentStyle: { backgroundColor: c.surface },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="add-todo"
                options={{
                  presentation: 'modal',
                  // Android's slide-from-bottom takes 400ms; a quick fade keeps it light.
                  ...(Platform.OS === 'android' && { animation: 'fade' }),
                }}
              />
              <Stack.Screen name="todo/[id]" options={{ presentation: 'card' }} />
              <Stack.Screen
                name="note/[id]"
                options={{ presentation: 'card', headerShown: false }}
              />
              <Stack.Screen name="goals" options={{ presentation: 'card', title: 'Goals' }} />
              <Stack.Screen
                name="pick"
                options={{
                  presentation: 'modal',
                  title: 'Pick for me',
                  ...(Platform.OS === 'android' && { animation: 'fade' }),
                }}
              />
            </Stack>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
