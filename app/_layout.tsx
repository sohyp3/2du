import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useNoteStore } from '@/store/noteStore';
import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { startSync, useSyncStore } from '@/store/syncStore';
import { useCalendarsStore } from '@/store/calendarsStore';
import { useGoalStore } from '@/store/goalStore';
import { useBriefStore } from '@/store/briefStore';
import { useFocusStore } from '@/store/focusStore';
import { useReducedMotion } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { PressFeedback } from '@/components/PressFeedback';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
// Per-weight imports: the package roots pull every weight into the build (14 MB on web).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { initDatabase, DatabaseError, getSetting, setSetting } from '@/db/database';
import { getTodoById } from '@/db/todos';
import { setupNotifications, snoozeTodoReminder } from '@/utils/notifications';
import { useTodoStore } from '@/store/todoStore';
import { useThemeStore, type ThemeColors } from '@/store/themeStore';
import { useColors, useFontFamily, useScheme } from '@/utils/theme';
import { useCalendarStore } from '@/store/calendarStore';
import { AppTitle } from '@/components/AppTitle';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { preloadTing } from '@/utils/ting';
import { registerServiceWorker } from '@/utils/pwa';
import { DATABASE_LOCKED } from '@/db/initializationError';

const LOCK_RELOAD_KEY = '2du-lock-reload';

function openBrief() {
  void useSyncStore.getState().sync();
  router.push('/brief');
}

async function syncBriefTimeZone() {
  try {
    if ((await getSetting('brief_enabled')) !== 'true') return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || (await getSetting('brief_tz')) === tz) return;
    // The session may still be restoring; wait briefly for it.
    for (let i = 0; i < 20 && !useSyncStore.getState().token; i++)
      await new Promise((r) => setTimeout(r, 500));
    if (!useSyncStore.getState().token) return;
    await useSyncStore
      .getState()
      .request('prefs', { method: 'PATCH', body: JSON.stringify({ tz }) });
    await setSetting('brief_tz', tz);
  } catch (error) {
    console.error('Failed to update brief time zone:', error);
  }
}

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
  const mode = useThemeStore((s) => s.mode);
  const scheme = useScheme();
  const fonts = useFontFamily();
  const loadSettings = useThemeStore((s) => s.loadSettings);
  const loadCalendarSettings = useCalendarStore((s) => s.loadSettings);
  const { setColorScheme } = useColorScheme();
  const c = useColors();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
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
        void useFocusStore.getState().load();
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
    // Pass the mode, not the resolved scheme: on native a forced scheme overrides the OS value
    // that `useColorScheme()` reports, so `system` must stay unforced to keep following the OS.
    setColorScheme(mode);
    if (Platform.OS !== 'web') return;
    // Browser-drawn surfaces (focus ring, caret, selection, scrollbar) follow the theme too.
    const root = document.documentElement.style;
    for (const key of Object.keys(c) as (keyof ThemeColors)[])
      root.setProperty(`--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, c[key]);
    root.colorScheme = scheme;
    root.setProperty('--accent', c.primary);
    root.setProperty('--selection', `${c.primary}40`);
    root.setProperty('--ink', c.onSurface);
    root.setProperty('--scrollbar', c.surfaceContainerHighest);
    document.body.style.backgroundColor = c.surface;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.surface);
  }, [mode, scheme, setColorScheme, c]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.brief) {
        openBrief();
        return;
      }
      const action = response.actionIdentifier;
      const data = response.notification.request.content.data;
      const todoId = data?.todoId as string | undefined;
      if (!todoId) return;

      if (data?.type === 'focus') {
        if (action === 'mark-done') void useFocusStore.getState().finish(todoId);
        else router.push({ pathname: '/focus', params: { id: todoId } });
        return;
      }

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

  // Cold start from the brief notification, and keep the server's time zone current.
  const briefLaunchChecked = useRef(false);
  useEffect(() => {
    if (isInitializing || initError || briefLaunchChecked.current) return;
    briefLaunchChecked.current = true;
    if (Platform.OS !== 'web')
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response?.notification.request.content.data?.brief) openBrief();
        })
        .catch((error) => console.error('Failed to read launch notification:', error));
    void syncBriefTimeZone();
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

  const navigationTheme = scheme === 'light' ? DefaultTheme : DarkTheme;
  return (
    <ThemeProvider
      value={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: c.surface,
          card: c.surface,
          text: c.onSurface,
          border: c.outlineVariant,
          primary: c.primary,
        },
      }}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
            <Stack
              screenOptions={{
                // Android 13+'s system default transition runs 450ms; the iOS-style slide
                // is 200ms and feels much snappier. iOS keeps its native push.
                animation: reducedMotion
                  ? 'fade'
                  : Platform.OS === 'android'
                    ? 'ios_from_right'
                    : 'default',
                headerStyle: { backgroundColor: c.surface },
                headerShadowVisible: false,
                headerTintColor: c.primary,
                headerTitleStyle: { color: c.onSurface, fontFamily: fonts.medium },
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
              <Stack.Screen name="brief" options={{ presentation: 'card', title: 'Daily brief' }} />
              <Stack.Screen
                name="pick"
                options={{
                  presentation: 'modal',
                  title: 'Pick for me',
                  ...(Platform.OS === 'android' && { animation: 'fade' }),
                }}
              />
              <Stack.Screen
                name="focus"
                options={{
                  presentation: 'fullScreenModal',
                  headerShown: false,
                  gestureEnabled: false,
                  animation: reducedMotion ? 'none' : 'fade',
                  animationDuration: 180,
                }}
              />
            </Stack>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
