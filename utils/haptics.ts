import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Haptics are a bonus on top of visual feedback: silent on web, and any failure (no hardware,
// haptics off) is swallowed.
const native = Platform.OS !== 'web';

function run(fire: () => Promise<void>) {
  if (!native) return;
  try {
    fire().catch(() => {});
  } catch {}
}

/** A light tap, for a button press that commits something. */
export function tap() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Something finished well: a task completed, a form saved. */
export function success() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A value ticks over: a chip, a segment, a toggle. */
export function select() {
  run(() => Haptics.selectionAsync());
}
