import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Todo } from '@/db/todos';

const REMINDER_OFFSET_MINUTES = 30;
const CATEGORY_ID = 'todo-reminder';

/** Configure how notifications display and register snooze actions. */
export async function setupNotifications() {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: 'snooze-5', buttonTitle: 'Snooze 5m' },
    { identifier: 'snooze-10', buttonTitle: 'Snooze 10m' },
    { identifier: 'snooze-30', buttonTitle: 'Snooze 30m' },
    { identifier: 'mark-done', buttonTitle: 'Done' },
  ]);
}

/** Request notification permissions. Returns true if granted. */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Schedule reminder notifications for a todo (30min before + on time). */
export async function scheduleTodoReminders(todo: Todo): Promise<void> {
  if (Platform.OS === 'web' || !todo.remind_me) return;

  const granted = await requestPermissions();
  if (!granted) return;

  const todoDate = new Date(todo.datetime);
  const now = Date.now();

  // 30 minutes before
  const beforeMs = todoDate.getTime() - REMINDER_OFFSET_MINUTES * 60 * 1000;
  if (beforeMs > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${todo.name}`,
        body: `Starting in ${REMINDER_OFFSET_MINUTES} minutes`,
        categoryIdentifier: CATEGORY_ID,
        data: { todoId: todo.id, type: 'before' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(beforeMs) },
    });
  }

  // On time
  if (todoDate.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: todo.name,
        body: 'Time to start!',
        categoryIdentifier: CATEGORY_ID,
        data: { todoId: todo.id, type: 'ontime' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: todoDate },
    });
  }
}

/** Cancel all scheduled notifications for a given todo. */
export async function cancelTodoReminders(todoId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.data?.todoId === todoId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/** Send a test notification after N minutes (0 = immediate). */
export async function sendTestNotification(minutes: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestPermissions();
  if (!granted) return false;

  if (minutes === 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '2du Test',
        body: 'Notifications are working!',
      },
      trigger: null,
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '2du Test',
        body: `Test notification (${minutes}m delay)`,
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
    });
  }

  return true;
}

/** Snooze: schedule a new notification N minutes from now. */
export async function snoozeTodoReminder(todo: Todo, minutes: number): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: todo.name,
      body: `Snoozed — ${minutes}m reminder`,
      categoryIdentifier: CATEGORY_ID,
      data: { todoId: todo.id, type: 'snooze' },
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
}
