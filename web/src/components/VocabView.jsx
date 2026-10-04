import { useMemo, useState } from 'react'
import vocabData from '../data/vocab.json'
import { RKEY, lsGet, lsSet, speak } from '../lib/store.js'
import { awardAnswer, sample, shuffle } from '../lib/practice.js'
import Feedback from './Feedback.jsx'

const MAX_BOX = 5
const SESSION_LEN = 12

function loadSrs() {
  const v = lsGet(RKEY, {})
  return v && typeof v === 'object' && v.boxes ? v : { boxes: {} }
}

function boxOf(srs, en) {
  return srs.boxes[en] || 1
}

/** Due-first ordering: lowest box first, then random. */
function orderQueue(words, srs) {
  return words
    .map((w) => ({ w, r: Math.random() }))
    .sort((a, b) => boxOf(srs, a.w.en) - boxOf(srs, b.w.en) || a.r - b.r)
    .map((x) => x.w)
}

export default function VocabView({ settings, progress, setProgress }) {
  const [srs, setSrs] = useState(loadSrs)
  const [dir, setDir] = useState('mixed')
  const [level, setLevel] = useState('all')
  const [queue, setQueue] = useState(() => sample(vocabData, SESSION_LEN))
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [fb, setFb] = useState(null)
  const [streak, setStreak] = useState(0)
  const [round, setRound] = useState(1)
  const [showMr, setShowMr] = useState(true)

  const word = queue[idx]
  const askMr = useMemo(() => {
    if (!word) return true
    if (dir === 'en-mr') return false
    if (dir === 'mr-en') return true
    return word.en.length % 2 === 0
  }, [word, dir, round]) // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => {
    if (!word) return []
    const pool = vocabData.filter((d) => d.en !== word.en && d.level === word.level)
    const distract = shuffle(pool).slice(0, 3)
    return shuffle([word, ...distract])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, round])

  const dist = useMemo(() => {
    const d = [0, 0, 0, 0, 0]
    for (const w of vocabData) d[boxOf(srs, w.en) - 1]++
    return d
  }, [srs])

  function persist(next) {
    setSrs(next)
    lsSet(RKEY, next)
  }

  function newSession(nextDir = dir, nextLevel = level) {
    const pool = vocabData.filter((w) => nextLevel === 'all' || w.level === Number(nextLevel))
    setQueue(orderQueue(sample(pool, Math.min(SESSION_LEN * 2, pool.length)), srs).slice(0, SESSION_LEN))
    setIdx(0)
    setPicked(null)
    setFb(null)
    setRound((r) => r + 1)
  }

  function grade(choice) {
    if (fb || !word) return
    const ok = choice.en === word.en
    awardAnswer(setProgress, 'vocab', ok)
    setStreak((s) => (ok ? s + 1 : 0))
    const nextBox = ok ? Math.min(MAX_BOX, boxOf(srs, word.en) + 1) : 1
    persist({ boxes: { ...srs.boxes, [word.en]: nextBox } })
    setPicked(choice.en)
    setFb({
      ok,
      answer: ok ? '' : askMr ? word.en : word.mr,
      explain: `${word.mr} · ${word.en}${word.tr ? ` · ${word.tr}` : ''} — पेटी ${boxOf(srs, word.en)} → ${nextBox}`,
    })
  }

  function next() {
    setFb(null)
    setPicked(null)
    if (idx + 1 < queue.length) setIdx(idx + 1)
    else newSession()
  }

  const pct = queue.length ? Math.round((100 * idx) / queue.length) : 0

  return (
    <div>
      <div className="card">
        <h2>शब्द-संग्रह — Vocab Quiz</h2>
        <div className="row" role="tablist" aria-label="Quiz direction">
          {[
            ['en-mr', 'EN → MR'],
            ['mr-en', 'MR → EN'],
            ['mixed', 'मिश्र Mixed'],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              id={`vocab-tabbtn-${id}`}
              aria-selected={dir === id}
              aria-controls="vocab-panel"
              className={`btn small ${dir === id ? '' : 'secondary'}`}
              data-testid={`vocab-dir-${id}`}
              onClick={() => {
                setDir(id)
                setStreak(0)
                newSession(id, level)
              }}
            >
              {label}
            </button>
          ))}
          <label className="field" style={{ maxWidth: 130 }}>
            स्तर · Level
            <select data-testid="vocab-level" value={level} onChange={(e) => { setLevel(e.target.value); setStreak(0); newSession(dir, e.target.value) }}>
              <option value="all">सर्व All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
          <button
            className="btn secondary small"
            data-testid="vocab-audio-toggle"
            onClick={() => setShowMr((v) => !v)}
            title="Toggle Marathi script display"
          >
            {showMr ? 'MR लिपी लपवा' : 'MR लिपी दाखवा'}
          </button>
        </div>
        <div className="srs-row" data-testid="srs-boxes" aria-label="SRS box distribution">
          {dist.map((n, i) => (
            <span key={i} className="srs-box" data-box={i + 1}>
              📦{i + 1} · {n}
            </span>
          ))}
        </div>
        <p className="muted small">
          XP {progress.xp} · 🔥 {streak} streak · {vocabData.length} शब्द · SRS पेट्या mt.srs.v1 मध्ये जतन
        </p>
      </div>

      <div className="card" key={round} data-testid="vocab-card" role="tabpanel" id="vocab-panel" aria-labelledby={`vocab-tabbtn-${dir}`}>
        {!word ? (
          <p className="muted">या स्तरावर शब्द नाहीत.</p>
        ) : (
          <>
            <div className="progress-bar" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div style={{ width: `${pct}%` }} />
            </div>
            <p className="muted small">
              प्रश्न {idx + 1}/{queue.length} · पेटी {boxOf(srs, word.en)} · {word.pos} · स्तर {word.level}
            </p>
            <h3 className="story-text" data-testid="vocab-prompt">
              {askMr ? (showMr ? word.mr : word.tr || word.en) : word.en}
            </h3>
            {askMr && (
              <button className="btn secondary small" data-testid="vocab-hear" onClick={() => speak(word.mr, settings)}>
                🔊 ऐका
              </button>
            )}
            <div className="opts">
              {options.map((o) => (
                <button
                  key={o.en}
                  className={`opt ${fb ? (o.en === word.en ? 'correct' : o.en === picked ? 'wrong' : '') : ''}`}
                  disabled={!!fb}
                  data-testid={`vocab-opt-${o.en === word.en ? 'answer' : 'other'}`}
                  onClick={() => grade(o)}
                >
                  {askMr ? o.en : showMr ? o.mr : o.tr || o.en}
                </button>
              ))}
            </div>
            <Feedback fb={fb} streak={streak} onNext={next} />
            {!fb && (
              <div className="row" style={{ marginTop: '.5rem' }}>
                <button className="btn secondary small" data-testid="vocab-new" onClick={() => newSession()}>
                  नवा संच
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
