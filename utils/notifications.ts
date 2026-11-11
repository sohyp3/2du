import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Todo } from '@/db/todos';
import { getSetting } from '@/db/database';

const REMINDER_OFFSET_MINUTES = 30;
const CATEGORY_ID = 'todo-reminder';
const FOCUS_CATEGORY_ID = 'focus-end';
const SOUND = 'default';
// Android channels are immutable once created: a channel that was ever created silent (or muted
// by the system) stays silent. New ids give every install fresh channels with sound.
const CHANNEL_BEFORE = 'reminders-before-v2';
const CHANNEL_ONTIME = 'reminders-ontime-v2';
const CHANNEL_FOCUS = 'focus-timer-v1';
const OLD_CHANNELS = ['todo-before', 'todo-ontime'];
const VIBRATION = [0, 250, 150, 250];

const android = <T extends object>(value: T) => (Platform.OS === 'android' ? value : {});

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
    const base = {
      sound: SOUND,
      enableVibrate: true,
      vibrationPattern: VIBRATION,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    };
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNEL_BEFORE, {
        ...base,
        name: 'Upcoming reminders',
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync(CHANNEL_ONTIME, {
        ...base,
        name: 'On-time reminders',
        importance: Notifications.AndroidImportance.HIGH,
      }),
      Notifications.setNotificationChannelAsync(CHANNEL_FOCUS, {
        ...base,
        name: 'Focus timer',
        importance: Notifications.AndroidImportance.MAX,
      }),
      ...OLD_CHANNELS.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => {})),
    ]);
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: 'snooze-5', buttonTitle: 'Snooze 5m' },
    { identifier: 'snooze-10', buttonTitle: 'Snooze 10m' },
    { identifier: 'snooze-30', buttonTitle: 'Snooze 30m' },
    { identifier: 'mark-done', buttonTitle: 'Done' },
  ]);
  await Notifications.setNotificationCategoryAsync(FOCUS_CATEGORY_ID, [
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
        sound: SOUND,
        ...android({ channelId: CHANNEL_BEFORE }),
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
        sound: SOUND,
        ...android({ channelId: CHANNEL_ONTIME }),
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
    // The focus timer has its own lifecycle (see cancelFocusEnd).
    if (n.content.data?.todoId === todoId && n.content.data?.type !== 'focus') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/** Send a test notification after N minutes (0 = immediate). */
export async function sendTestNotification(minutes: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestPermissions();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '2du Test',
      body: minutes === 0 ? 'Notifications are working!' : `Test notification (${minutes}m delay)`,
      sound: SOUND,
      ...android({ channelId: CHANNEL_ONTIME }),
    },
    trigger:
      minutes === 0
        ? null
        : { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });

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
      sound: SOUND,
      ...android({ channelId: CHANNEL_ONTIME }),
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
      sound: SOUND,
      ...android({ channelId: CHANNEL_ONTIME }),
      data: { brief: true },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: Math.floor(total / 60),
      minute: total % 60,
    },
  });
}

const focusId = (todoId: string) => `focus-${todoId}`;

/** Schedules the "focus time is up" notification for `endsAt`, replacing an earlier one. */
export async function scheduleFocusEnd(
  todo: { id: string; name: string },
  endsAt: number
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(focusId(todo.id)).catch(() => {});
  if (endsAt <= Date.now() || !(await requestPermissions())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: focusId(todo.id),
    content: {
      title: 'Time is up',
      body: todo.name,
      sound: SOUND,
      categoryIdentifier: FOCUS_CATEGORY_ID,
      ...android({ channelId: CHANNEL_FOCUS }),
      data: { todoId: todo.id, type: 'focus' },
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
  });
}

export async function cancelFocusEnd(todoId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(focusId(todoId)).catch(() => {});
  await Notifications.dismissNotificationAsync(focusId(todoId)).catch(() => {});
}
