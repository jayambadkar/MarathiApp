import {PermissionsAndroid, Platform} from 'react-native';
import Voice from '@react-native-voice/voice';

export type VoiceErrorCode = 'unsupported' | 'no-speech' | 'timeout' | 'error';
export type VoiceError = {code: VoiceErrorCode; error?: unknown};

/** Sync linkage check: true when the native voice module is present. */
export function voiceAvailable(): boolean {
  try {
    const v: unknown = Voice;
    return !!v && typeof (v as {start?: unknown}).start === 'function';
  } catch {
    return false;
  }
}

function cleanupVoice(): void {
  try {
    Voice.removeAllListeners();
  } catch {
    /* already torn down */
  }
  try {
    Voice.cancel();
  } catch {
    /* already torn down */
  }
  try {
    void Voice.destroy().catch(() => {});
  } catch {
    /* already torn down */
  }
}

/**
 * One-shot speech recognition. Resolves the transcript string,
 * or rejects { code } with 'unsupported' | 'no-speech' | 'timeout' | 'error'.
 */
export function listenOnce(lang: string = 'mr-IN', timeoutMs: number = 8000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!voiceAvailable()) {
      reject({code: 'unsupported'} satisfies VoiceError);
      return;
    }
    const proceed = (): void => startListening(resolve, reject, lang, timeoutMs);
    if (Platform.OS === 'android') {
      void PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) proceed();
        else reject({code: 'unsupported'} satisfies VoiceError);
      });
      return;
    }
    proceed();
  });
}

function startListening(
  resolve: (t: string) => void,
  reject: (e: VoiceError) => void,
  lang: string,
  timeoutMs: number,
): void {
    let done = false;
    const finish = (fn: () => void): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanupVoice();
      fn();
    };
    const timer = setTimeout(() => {
      finish(() => reject({code: 'timeout'} satisfies VoiceError));
    }, timeoutMs);
    Voice.onSpeechResults = (e: {value?: string[]}) => {
      const transcript = e.value && e.value.length > 0 ? e.value[0] : '';
      finish(() => resolve(transcript));
    };
    Voice.onSpeechError = (e: {error?: {code?: string} | string}) => {
      const code = typeof e.error === 'string' ? e.error : e.error?.code;
      finish(() =>
        reject({
          code: code === 'no-speech' ? 'no-speech' : 'error',
          error: e.error,
        } satisfies VoiceError),
      );
    };
    Voice.onSpeechEnd = () => {
      finish(() => reject({code: 'no-speech'} satisfies VoiceError));
    };
    try {
      void Voice.start(lang).catch(() => {
        finish(() => reject({code: 'error'} satisfies VoiceError));
      });
    } catch {
      finish(() => reject({code: 'error'} satisfies VoiceError));
    }
}
