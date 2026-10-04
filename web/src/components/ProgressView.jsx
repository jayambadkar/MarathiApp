import { DEFAULT_PROGRESS } from '../lib/store.js'

const XP_MODES = ['chat', 'sprint', 'stories', 'drills', 'grammar', 'vocab']

export default function ProgressView({ progress, setProgress }) {
  const acc = progress.answers ? Math.round((100 * progress.correct) / progress.answers) : 0
  const mx = Math.max(1, ...XP_MODES.map((m) => progress.byMode[m] || 0))

  function reset() {
    setProgress({ ...DEFAULT_PROGRESS, byMode: {} })
  }

  return (
    <div className="card">
      <h2>प्रगती — Progress</h2>
      <div className="grid2">
        <div>
          <div className="kv">
            <span>XP</span>
            <b>{progress.xp}</b>
          </div>
          <div className="kv">
            <span>Streak (दिवस)</span>
            <b>🔥 {progress.streak}</b>
          </div>
          <div className="kv">
            <span>उत्तरं</span>
            <b>
              {progress.correct}/{progress.answers}
            </b>
          </div>
          <div className="kv">
            <span>अचूकता</span>
            <b>{acc}%</b>
          </div>
        </div>
        <div>
          <h3>XP by mode</h3>
          {XP_MODES.map((m) => {
            const v = progress.byMode[m] || 0
            const w = Math.round((100 * v) / mx)
            return (
              <div key={m}>
                <div className="kv">
                  <span>{m}</span>
                  <b>{v}</b>
                </div>
                <div className="progress-bar" role="progressbar" aria-label={`${m} XP`} aria-valuemin={0} aria-valuemax={mx} aria-valuenow={v}>
                  <div style={{ width: `${w}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="row" style={{ marginTop: '.7rem' }}>
        <button className="btn secondary small" id="pgReset" onClick={reset}>
          Reset progress
        </button>
      </div>
    </div>
  )
}
