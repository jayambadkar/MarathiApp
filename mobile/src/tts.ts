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
export async function speak(text: string, rate: number = 1, voiceId?: string): Promise<boolean> {
  try {
    const ok = await ensureInit();
    if (!ok) return false;
    try {
      await Tts.setDefaultLanguage('mr-IN');
    } catch {
      /* keep previously set language */
    }
    if (voiceId) {
      try {
        await Tts.setDefaultVoice(voiceId);
      } catch {
        /* unknown voice id — speak with the default voice */
      }
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

export type MarathiVoice = {id: string; name: string; lang: string};

/** List installed Marathi TTS voices. Never throws — returns [] on failure. */
export async function listMarathiVoices(): Promise<MarathiVoice[]> {
  try {
    const voices = (await Tts.voices()) as Array<{
      id?: string;
      name?: string;
      language?: string;
      lang?: string;
    }>;
    return (voices ?? [])
      .filter(v => (v.language ?? v.lang ?? '').toLowerCase().startsWith('mr'))
      .map(v => ({
        id: String(v.id ?? v.name ?? ''),
        name: String(v.name ?? v.id ?? ''),
        lang: String(v.language ?? v.lang ?? ''),
      }))
      .filter(v => v.id.length > 0);
  } catch {
    return [];
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
