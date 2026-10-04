import { useEffect, useRef, useState } from 'react'
import sprintsData from '../data/sprints.json'
import { speak } from '../lib/store.js'
import { XP_CORRECT, awardAnswer } from '../lib/practice.js'
import Feedback from './Feedback.jsx'

const BONUS_XP = 5

export default function SprintsView({ settings, progress, setProgress }) {
  const [level, setLevel] = useState('all')
  const [selId, setSelId] = useState(null)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [wpm, setWpm] = useState(null)
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState(null)
  const [fb, setFb] = useState(null)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef(null)
  const startRef = useRef(0)

  const list = sprintsData.filter((s) => level === 'all' || s.level === Number(level))
  const sprint = sprintsData.find((s) => s.id === selId)
  const q = sprint && wpm !== null ? sprint.questions[qi] : null

  useEffect(
    () => () => clearInterval(timerRef.current),
    [],
  )

  function openSprint(id) {
    clearInterval(timerRef.current)
    setSelId(id)
    setRunning(false)
    setElapsed(0)
    setWpm(null)
    setQi(0)
    setPicked(null)
    setFb(null)
    setStreak(0)
    setDone(false)
  }

  function startTimer() {
    if (running) return
    startRef.current = Date.now() - elapsed * 1000
    setRunning(true)
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000)
    }, 200)
  }

  function resetTimer() {
    clearInterval(timerRef.current)
    setRunning(false)
    setElapsed(0)
    setWpm(null)
    setQi(0)
    setPicked(null)
    setFb(null)
    setStreak(0)
    setDone(false)
  }

  function stopTimer() {
    clearInterval(timerRef.current)
    setRunning(false)
    const secs = Math.max(1, (Date.now() - startRef.current) / 1000)
    setElapsed(secs)
    if (sprint) {
      const rate = Math.round((sprint.words / secs) * 60)
      setWpm(rate)
      if (rate >= sprint.target_wpm) {
        // Target bonus: XP without an answers-tally entry.
        setProgress((p) => ({
          ...p,
          xp: p.xp + BONUS_XP,
          byMode: { ...p.byMode, sprint: (p.byMode.sprint || 0) + BONUS_XP },
        }))
      }
    }
  }

  function grade(i) {
    if (fb || !q) return
    const ok = i === q.answer
    awardAnswer(setProgress, 'sprint', ok)
    setStreak((s) => (ok ? s + 1 : 0))
    setPicked(i)
    setFb({ ok, answer: ok ? '' : q.options[q.answer], explain: '' })
  }

  function nextQ() {
    setFb(null)
    setPicked(null)
    if (qi + 1 < sprint.questions.length) setQi(qi + 1)
    else setDone(true)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0')

  return (
    <div>
      <div className="card">
        <h2>वाचन स्प्रिंट — Sprints</h2>
        <p className="muted small">
          {sprintsData.length} उतारे · लक्ष्य 40–140 WPM · XP {progress.xp} · 🔥 {streak} streak
        </p>
        <div className="row">
          <label className="field" style={{ maxWidth: 150 }}>
            स्तर · Level
            <select data-testid="sprint-level" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">सर्व All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
        <div className="chips-row" data-testid="sprint-list">
          {list.map((s) => (
            <button
              key={s.id}
              className={`btn small ${selId === s.id ? '' : 'secondary'}`}
              data-testid={`sprint-${s.id}`}
              onClick={() => openSprint(s.id)}
            >
              {s.id} · L{s.level} · {s.target_wpm}wpm
            </button>
          ))}
        </div>
      </div>

      {!sprint ? (
        <div className="card">
          <p className="muted">वर उतारा निवडा — टायमर लावून वाचा, WPM मोजा, मग प्रश्न सोडवा.</p>
        </div>
      ) : (
        <div className="card" data-testid="sprint-reader">
          <h3>
            {sprint.title_mr} <span className="muted small">{sprint.title_en} · {sprint.words} शब्द · लक्ष्य {sprint.target_wpm} WPM</span>
          </h3>
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="timer" data-testid="sprint-timer" aria-label="वाचलेला वेळ">{mm}:{ss}</span>
            {!running && wpm === null && (
              <button className="btn small" data-testid="sprint-start" onClick={startTimer}>
                ▶ वाचन सुरू
              </button>
            )}
            {running && (
              <button className="btn small" data-testid="sprint-stop" onClick={stopTimer}>
                ⏹ वाचन संपलं
              </button>
            )}
            {!running && wpm !== null && (
              <button className="btn secondary small" data-testid="sprint-reset" onClick={resetTimer}>
                ↺ पुन्हा वाचा
              </button>
            )}
            <button className="btn secondary small" data-testid="sprint-hear" onClick={() => speak(sprint.text_mr, settings)}>
              🔊 ऐका
            </button>
          </div>
          <p className="story-text" data-testid="sprint-text">{sprint.text_mr}</p>
          <p className="muted small">{sprint.text_en}</p>

          {wpm !== null && (
            <div data-testid="sprint-result">
              <p>
                तुमचा वेग: <b data-testid="sprint-wpm">{wpm} WPM</b> (लक्ष्य {sprint.target_wpm}){' '}
                {wpm >= sprint.target_wpm ? (
                  <span data-testid="sprint-hit">🎯 लक्ष्य गाठलं! +{BONUS_XP} XP बोनस</span>
                ) : (
                  <span data-testid="sprint-miss">💪 पुन्हा प्रयत्न करा — लक्ष्य {XP_CORRECT} XP/प्रश्न अजूनही मिळेल</span>
                )}
              </p>
            </div>
          )}

          {wpm !== null && !done && q && (
            <div data-testid="sprint-quiz">
              <p className="muted small">प्रश्न {qi + 1}/{sprint.questions.length}</p>
              {q.q_mr ? <p className="story-text">{q.q_mr}</p> : null}
              <h3 data-testid="sprint-q">{q.q_en}</h3>
              <div className="opts">
                {q.options.map((o, i) => (
                  <button
                    key={i}
                    className={`opt ${fb ? (i === q.answer ? 'correct' : i === picked ? 'wrong' : '') : ''}`}
                    disabled={!!fb}
                    data-testid={`sprint-opt-${i === q.answer ? 'answer' : 'other'}`}
                    onClick={() => grade(i)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <Feedback fb={fb} streak={streak} onNext={nextQ} />
            </div>
          )}

          {done && (
            <div data-testid="sprint-done">
              <p>✅ स्प्रिंट पूर्ण! <b>{wpm} WPM</b> · पुढचा उतारा निवडा किंवा स्तर बदला.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
