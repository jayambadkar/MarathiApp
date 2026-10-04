import { useEffect, useState } from 'react'
import { speakMarathi } from './speech.js'

export const SKEY = 'mt.settings.v1'
export const PKEY = 'mt.progress.v1'
export const RKEY = 'mt.srs.v1'
export const CKEY = 'mt.chat.v1'

export const DEFAULT_SETTINGS = {
  model: 'muse-spark-1.3-contributor',
  apiBase: '',
  apiKey: '',
  apiStyle: 'chat',
  speed: 1,
  translit: false,
  theme: 'light',
  level: 1,
}

export const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  lastDay: '',
  byMode: {},
  answers: 0,
  correct: 0,
}

export function lsGet(k, d) {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : d
  } catch {
    return d
  }
}

export function lsSet(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable — run stateless */
  }
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function touchStreak(progress) {
  const t = todayStr()
  if (progress.lastDay === t) return progress
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
  return {
    ...progress,
    streak: progress.lastDay === y ? progress.streak + 1 : 1,
    lastDay: t,
  }
}

export function useLocalStorage(key, defaults) {
  const [value, setValue] = useState(() => ({ ...defaults, ...lsGet(key, {}) }))
  useEffect(() => {
    lsSet(key, value)
  }, [key, value])
  return [value, setValue]
}

export function speak(text, settings) {
  return speakMarathi(text, { rate: settings.speed })
}

export function wipeAll() {
  for (const k of [SKEY, PKEY, RKEY, CKEY]) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}
