/** Cloud read-aloud: URL building, script-aware chunking, audio queue, stop.
 * Run: npm test  (from web/)
 * Browser TTS (speechSynthesis) must NEVER be touched by the TTS path.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

assert.equal('speechSynthesis' in globalThis, false, 'test env must lack speechSynthesis')

const played = []
let flakyFailsLeft = 0
globalThis.Audio = class {
  constructor() {
    this._src = ''
    this.playbackRate = 1
    this.paused = true
    this.onended = null
    this.onerror = null
    played.push(this)
  }
  set src(v) {
    this._src = v
  }
  get src() {
    return this._src
  }
  play() {
    this.paused = false
    this.playedSrc = this._src
    const s = String(this._src)
    if (s.includes('FAILME')) queueMicrotask(() => this.onerror?.(new Error('load')))
    else if (s.includes('FLAKY') && flakyFailsLeft > 0) {
      flakyFailsLeft--
      queueMicrotask(() => this.onerror?.(new Error('throttled')))
    } else queueMicrotask(() => this.onended?.())
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

const { ttsUrl, splitByScript, chunkSpeech, speakMarathi, stopSpeak } = await import(
  '../src/lib/speech.js'
)
const { speak } = await import('../src/lib/store.js')

const tick = (n = 10) => new Promise((r) => setTimeout(r, n))

test('ttsUrl builds encoded translate_tts URL with tl param', () => {
  const u = new URL(ttsUrl('मराठी भाषा', 'mr'))
  assert.equal(u.hostname, 'translate.google.com')
  assert.equal(u.pathname, '/translate_tts')
  assert.equal(u.searchParams.get('q'), 'मराठी भाषा')
  assert.equal(u.searchParams.get('tl'), 'mr')
  assert.equal(u.searchParams.get('tl'), 'mr')
  const en = new URL(ttsUrl('hello', 'en'))
  assert.equal(en.searchParams.get('tl'), 'en')
  const idx = new URL(ttsUrl('अ', 'mr', 2, 5))
  assert.equal(idx.searchParams.get('idx'), '2')
  assert.equal(idx.searchParams.get('total'), '5')
  assert.equal(idx.searchParams.get('textlen'), '1')
})

test('splitByScript separates Devanagari and Latin runs', () => {
  assert.deepEqual(splitByScript('मराठी भाषा'), [{ text: 'मराठी भाषा', lang: 'mr' }])
  assert.deepEqual(splitByScript('hello world'), [{ text: 'hello world', lang: 'en' }])
  const mixed = splitByScript('मऊ soft')
  assert.equal(mixed.length, 2)
  assert.equal(mixed[0].lang, 'mr')
  assert.equal(mixed[1].lang, 'en')
  assert.deepEqual(
    mixed.map((r) => r.text),
    ['मऊ', 'soft'],
  )
})

test('chunkSpeech keeps chunks short with per-chunk lang', () => {
  const longMr = Array(12).fill('मराठी भाषा शिकणे खूप छान आहे').join(' ')
  const chunks = chunkSpeech(`${longMr} plus some english words here`)
  assert.ok(chunks.length > 2, 'long text splits')
  for (const c of chunks) assert.ok(c.text.length <= 180, `chunk too long: ${c.text.length}`)
  assert.ok(chunks.some((c) => c.lang === 'mr'))
  assert.ok(chunks.some((c) => c.lang === 'en'))
  assert.deepEqual(chunkSpeech('   '), [])
})

test('speakMarathi plays mr/en audio queue in order, applies rate, fires callbacks', async () => {
  played.length = 0
  const seen = []
  let done = false
  const ok = speakMarathi('मऊ soft', {
    rate: 0.9,
    onChunk: (i, t) => seen.push([i, t]),
    onDone: () => {
      done = true
    },
  })
  assert.equal(ok, true)
  await tick(800)
  assert.equal(played.length, 2)
  assert.match(played[0].playedSrc, /tl=mr/)
  assert.match(played[1].playedSrc, /tl=en/)
  assert.equal(played[0].playbackRate, 0.9)
  assert.deepEqual(
    seen.map(([i]) => i),
    [0, 1],
  )
  assert.equal(done, true)
})

test('queued audio suppresses Referer (Google TTS 404s non-Google referers)', async () => {
  played.length = 0
  speakMarathi('नमस्कार', {})
  await tick(30)
  assert.ok(played.length >= 1)
  for (const a of played) assert.equal(a.referrerPolicy, 'no-referrer')
  stopSpeak()
})

test('speakMarathi error calls onError, never browser TTS', async () => {
  played.length = 0
  let err = null
  let done = false
  speakMarathi('FAILME मराठी', { onError: (e) => (err = e), onDone: () => (done = true) })
  await tick(3200)
  assert.ok(err instanceof Error)
  assert.equal(done, false)
  assert.equal('speechSynthesis' in globalThis, false)
})

test('speakMarathi retries a throttled chunk then completes', async () => {
  played.length = 0
  flakyFailsLeft = 1
  let done = false
  let err = null
  speakMarathi('FLAKY', { onDone: () => (done = true), onError: (e) => (err = e) })
  await tick(1500)
  assert.equal(played.length, 2)
  assert.equal(done, true)
  assert.equal(err, null)
})

test('stopSpeak pauses audio and silences pending callbacks', async () => {
  played.length = 0
  let done = false
  let err = null
  speakMarathi('मराठी भाषा शिकणे खूप छान आहे आणि रोज सराव करा', {
    onDone: () => (done = true),
    onError: (e) => (err = e),
  })
  stopSpeak()
  await tick(30)
  assert.ok(played.length >= 1)
  assert.ok(played.every((a) => a.paused))
  assert.equal(done, false)
  assert.equal(err, null)
})

test('store.speak delegates to cloud queue', async () => {
  played.length = 0
  const ok = speak('नमस्कार', { speed: 1 })
  assert.equal(ok, true)
  await tick(30)
  assert.equal(played.length, 1)
  assert.match(played[0].playedSrc, /tl=mr/)
  stopSpeak()
})
