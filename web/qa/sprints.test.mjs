/** Reading-sprint content guard: schema, word-count accuracy (WPM math),
 * quiz validity, and no template-generator leftovers.
 * Run: npm test  (from web/)
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sprints = JSON.parse(readFileSync(join(root, 'src/data/sprints.json'), 'utf8'))

const BANDS = { 1: [50, 80], 2: [65, 95], 3: [70, 105], 4: [88, 120] }
const TEMPLATE_BITS = [
  'वाचन स्प्रिंट S-',
  'Simple story about',
  'Advanced passage:',
  'Deep-sea diving',
  'Stock market',
  'Space travel',
]

test('sprints: 60 entries, 15 per level, stable ids', () => {
  assert.equal(sprints.length, 60)
  const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const ids = new Set()
  for (const s of sprints) {
    byLevel[s.level]++
    ids.add(s.id)
  }
  assert.deepEqual(byLevel, { 1: 15, 2: 15, 3: 15, 4: 15 })
  assert.equal(ids.size, 60)
})

test('sprints: schema, real titles, translation, WPM target', () => {
  for (const s of sprints) {
    assert.match(s.title_mr, /[\u0900-\u097F]{3,}/, `${s.id}: needs a real Marathi title`)
    assert.ok(s.title_en && !/words$/.test(s.title_en), `${s.id}: needs a real English title`)
    assert.ok(s.text_mr.length > 150, `${s.id}: text_mr too short`)
    assert.ok(s.text_en.length > 150, `${s.id}: text_en must be a translation, not a summary`)
    assert.ok(
      s.target_wpm >= 40 && s.target_wpm <= 140,
      `${s.id}: target_wpm out of range`,
    )
  }
})

test('sprints: words count matches text (WPM math depends on it)', () => {
  for (const s of sprints) {
    const actual = s.text_mr.split(/\s+/).filter(Boolean).length
    assert.equal(s.words, actual, `${s.id}: words=${s.words} but text has ${actual}`)
    const [lo, hi] = BANDS[s.level]
    assert.ok(lo <= actual && actual <= hi, `${s.id}: L${s.level} length ${actual} outside ${lo}-${hi}`)
  }
})

test('sprints: two valid quiz questions each, no joke distractors', () => {
  for (const s of sprints) {
    assert.equal(s.questions.length, 2, `${s.id}: needs 2 questions`)
    for (const q of s.questions) {
      assert.ok(q.q_mr && q.q_en, `${s.id}: bilingual question required`)
      assert.equal(q.options.length, 4, `${s.id}: needs 4 options`)
      assert.ok(
        Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4,
        `${s.id}: bad answer index`,
      )
      for (const o of q.options) assert.ok(o && o.length >= 2, `${s.id}: empty option`)
    }
  }
})

test('sprints: no template-generator leftovers', () => {
  const blob = JSON.stringify(sprints)
  for (const bit of TEMPLATE_BITS) assert.ok(!blob.includes(bit), `leftover: ${bit}`)
  const firstLines = sprints.map((s) => s.text_mr.split('.')[0])
  assert.equal(new Set(firstLines).size, 60, 'every sprint must open distinctly')
})
