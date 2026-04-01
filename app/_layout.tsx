import '../global.css';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { initDatabase } from '@/db/database';
import { setupNotifications, snoozeTodoReminder } from '@/utils/notifications';
import { getTodoById } from '@/db/todos';
import { useTodoStore } from '@/store/todoStore';

export default function Layout() {
  useEffect(() => {
    initDatabase();
    setupNotifications();
  }, []);

  // Handle notification action responses (snooze / done)
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

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-todo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="todo/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
