import Tts from 'react-native-tts';

let ready = false;

async function ensureInit(): Promise<boolean> {
  try {
    if (!ready) {
      await Tts.getInitStatus();
      await Tts.setDefaultLanguage('mr-IN');
      ready = true;
    }
    return true;
  } catch {
    return false;
  }
}

/** Read text aloud with the Marathi voice. Resolves false on any failure, never throws. */
export async function speak(text: string, rate: number = 1): Promise<boolean> {
  try {
    const ok = await ensureInit();
    if (!ok) return false;
    try {
      await Tts.setDefaultLanguage('mr-IN');
    } catch {
      /* keep previously set language */
    }
    try {
      await Tts.setDefaultRate(rate);
    } catch {
      /* engine rejected rate — speak at its default */
    }
    await Tts.speak(text);
    return true;
  } catch {
    return false;
  }
}

/** Stop playback immediately. Never throws. */
export function stopSpeak(): void {
  try {
    Tts.stop();
  } catch {
    /* already stopped */
  }
}
