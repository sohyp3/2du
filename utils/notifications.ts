import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Todo } from '@/db/todos';
import { getSetting } from '@/db/database';

const REMINDER_OFFSET_MINUTES = 30;
const CATEGORY_ID = 'todo-reminder';
const SOUND_BEFORE = 'default';
const SOUND_ONTIME = 'default';
const CHANNEL_BEFORE = 'todo-before';
const CHANNEL_ONTIME = 'todo-ontime';

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_BEFORE, {
      name: 'Upcoming reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND_BEFORE,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_ONTIME, {
      name: 'On-time reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND_ONTIME,
    });
  }

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
        sound: SOUND_BEFORE,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_BEFORE }),
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
        sound: SOUND_ONTIME,
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ONTIME }),
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
      sound: SOUND_ONTIME,
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ONTIME }),
      data: { todoId: todo.id, type: 'snooze' },
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
}

const BRIEF_ID = 'daily-brief';

/**
 * Schedules the daily brief notification, or cancels it. It fires 5 minutes after `time`
 * (HH:MM) because the server needs a moment to write the brief.
 */
export async function scheduleBriefNotification(enabled: boolean, time: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(BRIEF_ID).catch(() => {});
  if (!enabled) return;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return;
  if (!(await requestPermissions())) return;
  const total = (Number(match[1]) * 60 + Number(match[2]) + 5) % (24 * 60);
  const arabic = (await getSetting('brief_lang')) === 'ar';
  await Notifications.scheduleNotificationAsync({
    identifier: BRIEF_ID,
    content: {
      title: arabic ? 'موجزك اليومي' : 'Your daily brief',
      body: 'See what today looks like.',
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ONTIME }),
      data: { brief: true },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(total / 60),
      minute: total % 60,
    },
  });
}
