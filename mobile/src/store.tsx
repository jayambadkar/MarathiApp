import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {dark as darkTheme, light as lightTheme} from './theme';
import type {Theme} from './theme';
import {XP_CORRECT} from './lib';

export {XP_CORRECT};

export type Settings = {
  model: string;
  apiBase: string;
  apiKey: string;
  apiStyle: string;
  speed: number;
  translit: boolean;
  theme: 'light' | 'dark';
  level: number;
};

export type Progress = {
  xp: number;
  streak: number;
  lastDay: string;
  byMode: Record<string, number>;
  answers: number;
  correct: number;
};

export const SKEY = 'mt.settings.v1';
export const PKEY = 'mt.progress.v1';

export const DEFAULT_SETTINGS: Settings = {
  model: 'muse-spark-1.3-contributor',
  apiBase: '',
  apiKey: '',
  apiStyle: 'chat',
  speed: 1,
  translit: false,
  theme: 'light',
  level: 1,
};

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: 0,
  lastDay: '',
  byMode: {},
  answers: 0,
  correct: 0,
};

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function touchStreak(progress: Progress): Progress {
  const t = todayStr();
  if (progress.lastDay === t) return progress;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  return {
    ...progress,
    streak: progress.lastDay === y ? progress.streak + 1 : 1,
    lastDay: t,
  };
}

async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SKEY);
    if (!raw) return DEFAULT_SETTINGS;
    return {...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>)};
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(PKEY);
    if (!raw) return DEFAULT_PROGRESS;
    return {...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Partial<Progress>)};
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export type StoreValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  progress: Progress;
  award: (mode: string, ok: boolean, xp?: number) => void;
  resetAll: () => void;
  t: Theme;
  dark: boolean;
};

const StoreCtx = createContext<StoreValue | null>(null);

export function AppStore({children}: {children: ReactNode}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [s, p] = await Promise.all([loadSettings(), loadProgress()]);
      if (!live) return;
      setSettings(s);
      setProgress(p);
      setHydrated(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(SKEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(PKEY, JSON.stringify(progress)).catch(() => {});
  }, [progress, hydrated]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(s => ({...s, ...patch}));
  }, []);

  const award = useCallback((mode: string, ok: boolean, xp: number = XP_CORRECT) => {
    setProgress(p => {
      const t = touchStreak(p);
      return {
        ...t,
        xp: t.xp + (ok ? xp : 0),
        answers: t.answers + 1,
        correct: t.correct + (ok ? 1 : 0),
        byMode: {...t.byMode, [mode]: (t.byMode[mode] ?? 0) + (ok ? xp : 0)},
      };
    });
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setProgress(DEFAULT_PROGRESS);
    void AsyncStorage.removeMany([SKEY, PKEY]).catch(() => {});
  }, []);

  const dark = settings.theme === 'dark';
  const t = dark ? darkTheme : lightTheme;

  const value = useMemo<StoreValue>(
    () => ({settings, updateSettings, progress, award, resetAll, t, dark}),
    [settings, updateSettings, progress, award, resetAll, t, dark],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside AppStore');
  return v;
}
