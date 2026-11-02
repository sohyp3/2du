import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

// One preloaded sound, replayed from the start on every completion.
let sound: Promise<Audio.Sound | null> | null = null;

function load() {
  sound ??= (async () => {
    try {
      // Play through the media channel even when the ringer is silent.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
      const { sound: s } = await Audio.Sound.createAsync(require('@/assets/ting.mp3'), {
        volume: 1,
      });
      return s;
    } catch (error) {
      console.warn('Could not load completion sound:', error);
      sound = null;
      return null;
    }
  })();
  return sound;
}

export async function playTing() {
  const s = await load();
  if (!s) return;
  try {
    await s.replayAsync();
  } catch (error) {
    // The audio session can be lost while backgrounded; reload once.
    console.warn('Completion sound failed, reloading:', error);
    sound = null;
    s.unloadAsync().catch(() => {});
    const fresh = await load();
    await fresh?.replayAsync().catch(() => {});
  }
}

/** Load the sound ahead of time so the first tick plays without delay. */
export function preloadTing() {
  void load();
}
