import { streakLevel } from '../lib/practice.js'

/**
 * Duolingo-style answer feedback bar + session-streak level-up toast.
 * fb: null | { ok, answer, explain } — answer shown on wrong, explain optional.
 */
export default function Feedback({ fb, streak, onNext, nextLabel }) {
  if (!fb) return null
  const lvl = streakLevel(streak)
  const leveled = fb.ok && streak > 0 && streak % 5 === 0
  return (
    <div className={`feedback ${fb.ok ? 'ok' : 'bad'}`} role="status" data-testid="feedback">
      <div className="feedback-inner">
        <div>
          <div className="feedback-title">
            {fb.ok ? 'बरोबर! Correct ✓' : 'चूक — Correct answer:'}
            {streak >= 2 && fb.ok && (
              <span className="feedback-streak" data-testid="session-streak">
                {' '}
                🔥×{streak}
              </span>
            )}
          </div>
          {!fb.ok && fb.answer ? <div className="feedback-answer">{fb.answer}</div> : null}
          {fb.explain ? <div className="feedback-explain">{fb.explain}</div> : null}
          {leveled ? (
            <div className="levelup" data-testid="levelup">
              🎉 Streak level {lvl}! छान चाललंय!
            </div>
          ) : null}
        </div>
        <button className="btn" data-testid="feedback-next" onClick={onNext}>
          {nextLabel || 'पुढे →'}
        </button>
      </div>
    </div>
  )
}
