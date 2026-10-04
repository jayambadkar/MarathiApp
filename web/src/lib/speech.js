// Read-aloud via cloud TTS (Google Translate voice) + one-shot speech recognition.
//
// Browser speechSynthesis is deliberately NOT used: on Linux desktops it
// resolves to robotic/practically-unusable voices. No audio beats bad audio:
// on network failure we report onError and stay silent.

const TTS_BASE = 'https://translate.google.com/translate_tts'
const TTS_CLIENT = 'tw-ob'

/** Public MP3 URL for text in lang ('mr' | 'en'). No key needed. */
export function ttsUrl(text, lang = 'mr', idx = 0, total = 1) {
  const q = (text || '').trim()
  const p = new URLSearchParams({
    ie: 'UTF-8',
    q,
    tl: lang,
    client: TTS_CLIENT,
    total: String(total),
    idx: String(idx),
    textlen: String(q.length),
  })
  return `${TTS_BASE}?${p.toString()}`
}

const DEVA_RE = /[\u0900-\u097F]/
const LATIN_RE = /[A-Za-z0-9]/

/**
 * Split text into [{ text, lang }] runs: Devanagari → 'mr', Latin → 'en'.
 * Whitespace/punctuation attaches to the surrounding run.
 */
export function splitByScript(text) {
  const runs = []
  let cur = ''
  let curLang = null
  let pending = ''
  function flush() {
    const t = cur.trim()
    if (t) runs.push({ text: t, lang: curLang || 'mr' })
    cur = ''
    curLang = null
  }
  for (const ch of text || '') {
    const lang = DEVA_RE.test(ch) ? 'mr' : LATIN_RE.test(ch) ? 'en' : null
    if (!lang) {
      if (curLang === null) pending += ch
      else cur += ch
      continue
    }
    if (curLang === null) {
      curLang = lang
      cur = pending + ch
      pending = ''
    } else if (lang === curLang) {
      cur += ch
    } else {
      flush()
      curLang = lang
      cur = ch
    }
  }
  flush()
  if (!runs.length && (text || '').trim()) runs.push({ text: text.trim(), lang: 'mr' })
  return runs
}

/** Split long text into speakable chunks at sentence boundaries (max ~180 chars). */
export function chunkText(text, max = 180) {
  const parts = (text || '')
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out = []
  for (const p of parts) {
    if (p.length <= max) out.push(p)
    else {
      // hard-split long sentences on commas/spaces
      let cur = ''
      function pushWord(word) {
        while (word.length > max) {
          out.push(word.slice(0, max))
          word = word.slice(max)
        }
        if ((cur + ' ' + word).trim().length > max) {
          if (cur) out.push(cur)
          cur = word
        } else cur = (cur + ' ' + word).trim()
      }
      for (const word of p.split(/\s+/)) pushWord(word)
      if (cur) out.push(cur)
    }
  }
  return out
}

/** chunkText per script run → [{ text, lang }]. */
export function chunkSpeech(text, max = 180) {
  const out = []
  for (const run of splitByScript(text)) {
    for (const c of chunkText(run.text, max)) out.push({ text: c, lang: run.lang })
  }
  return out
}

let queue = []
let audio = null
let stopped = true
let cbs = {}
let retryTimer = null

const RETRY_DELAYS = [700, 1800]
const CHUNK_GAP = 250

/** Stop playback immediately. Manual stops stay silent (no callbacks). */
export function stopSpeak() {
  stopped = true
  queue = []
  cbs = {}
  try {
    if (retryTimer) clearTimeout(retryTimer)
  } catch {
    /* ignore */
  }
  retryTimer = null
  try {
    if (audio) {
      audio.pause()
      audio.src = ''
    }
  } catch {
    /* ignore */
  }
  audio = null
  return true
}

function fail(err) {
  if (stopped) return
  const e = cbs.onError
  stopSpeak()
  e?.(err)
}

function later(ms, fn) {
  try {
    if (retryTimer) clearTimeout(retryTimer)
  } catch {
    /* ignore */
  }
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (!stopped) fn()
  }, ms)
}

function playNext(i, attempt = 0) {
  if (stopped) return
  if (i >= queue.length) {
    const d = cbs.onDone
    stopSpeak()
    d?.()
    return
  }
  const ch = queue[i]
  const a = new Audio()
  audio = a
  a.preload = 'auto'
  a.playbackRate = cbs.rate || 1
  a.onended = () => {
    if (!stopped) later(CHUNK_GAP, () => playNext(i + 1))
  }
  a.onerror = () => {
    if (stopped) return
    // The endpoint throttles bursts (HTTP 404): retry before giving up.
    if (attempt < RETRY_DELAYS.length) later(RETRY_DELAYS[attempt], () => playNext(i, attempt + 1))
    else fail(new Error('tts-failed'))
  }
  if (attempt === 0) cbs.onChunk?.(i, ch.text)
  a.src = ttsUrl(ch.text, ch.lang, i, queue.length)
  try {
    const pr = a.play()
    if (pr && pr.catch)
      pr.catch(() => {
        if (stopped) return
        if (attempt < RETRY_DELAYS.length) later(RETRY_DELAYS[attempt], () => playNext(i, attempt + 1))
        else fail(new Error('play-blocked'))
      })
  } catch {
    fail(new Error('play-failed'))
  }
}

/**
 * Read text aloud with the cloud voice, chunk by chunk.
 * opts: { rate, chunkMax, onChunk(i, chunk), onDone, onError }.
 * Returns false when audio is unavailable.
 */
export function speakMarathi(text, opts = {}) {
  try {
    if (typeof Audio === 'undefined') {
      opts.onError?.(new Error('no-audio'))
      return false
    }
    const chunks = chunkSpeech(text, opts.chunkMax || 180)
    if (!chunks.length) {
      opts.onDone?.()
      return true
    }
    stopSpeak()
    stopped = false
    queue = chunks
    cbs = opts
    playNext(0)
    return true
  } catch (e) {
    opts.onError?.(e)
    return false
  }
}

/**
 * One-shot speech recognition. Resolves { transcript } or rejects { code }.
 * codes: 'unsupported' | 'no-speech' | 'timeout' | 'error'
 */
export function listenOnce({ lang = 'mr-IN', timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      reject({ code: 'unsupported' })
      return
    }
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      reject({ code: 'timeout' })
    }, timeoutMs)
    rec.onresult = (e) => {
      if (done) return
      done = true
      clearTimeout(timer)
      const t = e.results?.[0]?.[0]?.transcript || ''
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      resolve({ transcript: t })
    }
    rec.onerror = (e) => {
      if (done) return
      done = true
      clearTimeout(timer)
      reject({ code: e.error === 'no-speech' ? 'no-speech' : 'error', error: e.error })
    }
    rec.onend = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      reject({ code: 'no-speech' })
    }
    try {
      rec.start()
    } catch {
      done = true
      clearTimeout(timer)
      reject({ code: 'error' })
    }
  })
}
