// TTS + STT utilities: Marathi voice picking, chunked speech queue,
// karaoke word-boundary tracking, and one-shot speech recognition.

export function listVoices() {
  try {
    return speechSynthesis.getVoices() || []
  } catch {
    return []
  }
}

/** Pick the best Marathi voice: exact setting, then mr-IN/mr, then any. */
export function pickMarathiVoice(preferred) {
  const vs = listVoices()
  if (!vs.length) return null
  if (preferred) {
    const exact = vs.find((v) => v.name === preferred)
    if (exact) return exact
  }
  return (
    vs.find((v) => (v.lang || '').toLowerCase() === 'mr-in') ||
    vs.find((v) => (v.lang || '').toLowerCase().startsWith('mr')) ||
    vs.find((v) => (v.lang || '').toLowerCase().startsWith('hi')) ||
    vs[0]
  )
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

export function stopSpeak() {
  try {
    speechSynthesis.cancel()
    return true
  } catch {
    return false
  }
}

/**
 * Speak Marathi text in chunks. opts: { voice, rate, onChunk(i, chunk), onDone, onError }.
 * Returns false when TTS is unavailable.
 */
export function speakMarathi(text, opts = {}) {
  try {
    if (!('speechSynthesis' in window)) {
      opts.onError?.(new Error('no-tts'))
      return false
    }
    const chunks = chunkText(text)
    if (!chunks.length) {
      opts.onDone?.()
      return true
    }
    speechSynthesis.cancel()
    const voice = pickMarathiVoice(opts.voice)
    let i = 0
    function next() {
      if (i >= chunks.length) {
        opts.onDone?.()
        return
      }
      const u = new SpeechSynthesisUtterance(chunks[i])
      u.lang = 'mr-IN'
      u.rate = opts.rate || 1
      if (voice) u.voice = voice
      const idx = i
      u.onstart = () => opts.onChunk?.(idx, chunks[idx])
      u.onend = () => {
        i++
        next()
      }
      u.onerror = (e) => {
        if (idx === 0) opts.onError?.(e)
        i++
        next()
      }
      speechSynthesis.speak(u)
    }
    next()
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
