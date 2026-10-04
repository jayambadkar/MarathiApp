import { touchStreak } from './store.js'

export const XP_CORRECT = 10
export const STREAK_LEVEL_EVERY = 5

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, n)
}

/**
 * Shuffle stored MCQ options, remapping the answer index to the new order.
 * Stored content skews hard (stories/grammar pile the answer at index 0),
 * so every stored-order quiz must render through this. Index-based remap
 * stays correct even with duplicate option labels.
 */
export function shuffleOptions(options, answer) {
  const order = shuffle(options.map((_, i) => i))
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) }
}

/** Record one graded answer: +XP on correct, answers/correct tallies, streak touch. */
export function awardAnswer(setProgress, mode, ok, xp = XP_CORRECT) {
  setProgress((p) => {
    const t = touchStreak(p)
    return {
      ...t,
      xp: t.xp + (ok ? xp : 0),
      answers: t.answers + 1,
      correct: t.correct + (ok ? 1 : 0),
      byMode: { ...t.byMode, [mode]: (t.byMode[mode] || 0) + (ok ? xp : 0) },
    }
  })
}

export function normEn(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[?!.,;:'"“”‘’।]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normMr(s) {
  return (s || '')
    .replace(/[?!.,;:'"“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Session-streak level: 1 at 5-in-a-row, 2 at 10, … 0 below 5. */
export function streakLevel(streak) {
  return streak >= STREAK_LEVEL_EVERY ? Math.floor(streak / STREAK_LEVEL_EVERY) : 0
}

export const CHOICE_TYPES = ['mcq', 'fill-blank', 'match']

/** Grade one drill response: { selected } | { typed } | { built }. */
export function checkDrill(ex, resp) {
  if (CHOICE_TYPES.includes(ex.type)) return resp.selected === ex.answer
  if (ex.type === 'reorder') return normMr(resp.built.join(' ')) === normMr(ex.answer)
  if (ex.type === 'translate-mr-en') return normEn(resp.typed) === normEn(ex.answer)
  return normMr(resp.typed) === normMr(ex.answer)
}
