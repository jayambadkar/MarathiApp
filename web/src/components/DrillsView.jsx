import { useEffect, useRef, useState } from 'react'
import drillsData from '../data/drills.json'
import vocabData from '../data/vocab.json'
import speakingData from '../data/speaking.json'
import { speak } from '../lib/store.js'
import { CHOICE_TYPES, awardAnswer, checkDrill, sample, shuffle } from '../lib/practice.js'
import Feedback from './Feedback.jsx'

const EXERCISES = drillsData.exercises
const SESSION_LEN = 10
const MIC_TIMEOUT_MS = 8000

const TYPE_LABEL = {
  mcq: 'निवडा · MCQ',
  'fill-blank': 'रिकामी जागा · Fill blank',
  'translate-en-mr': 'भाषांतर EN→MR',
  'translate-mr-en': 'भाषांतर MR→EN',
  reorder: 'शब्द लावा · Reorder',
  match: 'जोड्या लावा · Match',
}

function buildVocabDrills(level) {
  const pool = vocabData.filter((w) => level === 'all' || w.level === Number(level))
  return sample(pool, 60).map((w, i) => {
    const dir = i % 2 === 0 ? 'translate-en-mr' : 'translate-mr-en'
    const distract = shuffle(
      vocabData.filter((d) => d.en !== w.en && d.level === w.level),
    ).slice(0, 3)
    return {
      id: `v-${w.en}`,
      level: w.level,
      type: 'mcq',
      skill: `vocab:${w.cat}`,
      prompt_en:
        dir === 'translate-en-mr' ? `Choose the Marathi for "${w.en}"` : `Choose the English for "${w.mr}"`,
      prompt_mr: '',
      choices: shuffle(
        dir === 'translate-en-mr'
          ? [w.mr, ...distract.map((d) => d.mr)]
          : [w.en, ...distract.map((d) => d.en)],
      ),
      answer: dir === 'translate-en-mr' ? w.mr : w.en,
      hint_en: `${w.pos}${w.tr ? ` · ${w.tr}` : ''}`,
    }
  })
}

function useMic() {
  const recRef = useRef(null)
  const timerRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [micMsg, setMicMsg] = useState('')
  const supported =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      try {
        recRef.current?.stop()
      } catch {
        /* already stopped */
      }
    },
    [],
  )

  function stopTimer() {
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function start(onResult) {
    if (!supported || listening) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'mr-IN'
    rec.interimResults = true
    rec.maxAlternatives = 1
    setTranscript('')
    setMicMsg('')
    setListening(true)
    // Mic-timeout guard: never listen forever.
    timerRef.current = setTimeout(() => {
      setMicMsg('मायक वेळ संपला (8s) — पुन्हा प्रयत्न करा किंवा स्वतः गुण द्या.')
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }, MIC_TIMEOUT_MS)
    rec.onresult = (e) => {
      let text = ''
      for (const r of e.results) text += r[0].transcript
      setTranscript(text)
      if (e.results[e.results.length - 1].isFinal) {
        stopTimer()
        onResult?.(text)
      }
    }
    rec.onerror = (e) => {
      stopTimer()
      setListening(false)
      setMicMsg(`मायक त्रुटी: ${e.error} — स्वतः गुण द्या.`)
    }
    rec.onend = () => {
      stopTimer()
      setListening(false)
    }
    try {
      rec.start()
    } catch {
      stopTimer()
      setListening(false)
      setMicMsg('मायक सुरू झाला नाही — स्वतः गुण द्या.')
    }
  }

  function stop() {
    stopTimer()
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
  }

  return { supported: !!supported, listening, transcript, micMsg, start, stop }
}

function ReorderInput({ ex, built, setBuilt }) {
  const remaining = ex.choices.filter((c) => built.filter((b) => b === c).length < ex.choices.filter((x) => x === c).length)
  return (
    <div>
      <div className="built-line" data-testid="reorder-built" aria-live="polite">
        {built.length ? built.join(' ') : <span className="muted">शब्दांवर टॅप करा…</span>}
      </div>
      <div className="chips-row">
        {remaining.map((c, i) => (
          <button key={`${c}-${i}`} className="btn secondary small" onClick={() => setBuilt([...built, c])}>
            {c}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: '.4rem' }}>
        <button className="btn secondary small" disabled={!built.length} onClick={() => setBuilt(built.slice(0, -1))}>
          ↩ मागे
        </button>
        <button className="btn secondary small" disabled={!built.length} onClick={() => setBuilt([])}>
          साफ करा
        </button>
      </div>
    </div>
  )
}

export default function DrillsView({ settings, progress, setProgress }) {
  const [tab, setTab] = useState('pack')
  const [level, setLevel] = useState('all')
  const [queue, setQueue] = useState(() => sample(EXERCISES, SESSION_LEN))
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [typed, setTyped] = useState('')
  const [built, setBuilt] = useState([])
  const [fb, setFb] = useState(null)
  const [streak, setStreak] = useState(0)
  const [round, setRound] = useState(1)
  const [speakIdx, setSpeakIdx] = useState(0)
  const mic = useMic()

  const ex = queue[idx]
  const pool = tab === 'pack' ? EXERCISES : null
  const filteredCount = pool ? pool.filter((e) => level === 'all' || e.level === Number(level)).length : 0

  function newSession(nextTab = tab, nextLevel = level) {
    const src =
      nextTab === 'vocab'
        ? buildVocabDrills(nextLevel)
        : EXERCISES.filter((e) => nextLevel === 'all' || e.level === Number(nextLevel))
    setQueue(sample(src, Math.min(SESSION_LEN, src.length)))
    setIdx(0)
    setSelected(null)
    setTyped('')
    setBuilt([])
    setFb(null)
    setRound((r) => r + 1)
  }

  function switchTab(next) {
    setTab(next)
    setStreak(0)
    if (next !== 'speaking') newSession(next, level)
  }

  function changeLevel(next) {
    setLevel(next)
    setStreak(0)
    if (tab !== 'speaking') newSession(tab, next)
  }

  function grade(resp) {
    if (fb || !ex) return
    const ok = checkDrill(ex, resp)
    awardAnswer(setProgress, 'drills', ok)
    setStreak((s) => (ok ? s + 1 : 0))
    setFb({ ok, answer: ok ? '' : ex.answer, explain: ex.hint_en })
  }

  function next() {
    setFb(null)
    setSelected(null)
    setTyped('')
    setBuilt([])
    if (idx + 1 < queue.length) setIdx(idx + 1)
    else newSession()
  }

  const speakingPool = speakingData.filter((s) => level === 'all' || s.level === Number(level))
  const prompt = speakingPool[speakIdx % Math.max(1, speakingPool.length)]

  function speakNext() {
    mic.stop()
    setSpeakIdx((i) => i + 1)
  }

  function selfGrade(ok) {
    awardAnswer(setProgress, 'drills', ok)
    setStreak((s) => (ok ? s + 1 : 0))
    speakNext()
  }

  const pct = queue.length ? Math.round((100 * idx) / queue.length) : 0

  return (
    <div>
      <div className="card">
        <h2>सराव — Drills</h2>
        <div className="row" role="tablist" aria-label="Drill sources">
          {[
            ['pack', `200-पॅक (${EXERCISES.length})`],
            ['vocab', 'शब्द-संचित drills'],
            ['speaking', `बोलणं (${speakingData.length})`],
          ].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              id={`drill-tabbtn-${id}`}
              aria-selected={tab === id}
              aria-controls="drill-panel"
              className={`btn small ${tab === id ? '' : 'secondary'}`}
              data-testid={`drill-tab-${id}`}
              onClick={() => switchTab(id)}
            >
              {label}
            </button>
          ))}
          <label className="field" style={{ maxWidth: 150 }}>
            स्तर · Level
            <select data-testid="drill-level" value={level} onChange={(e) => changeLevel(e.target.value)}>
              <option value="all">सर्व All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
        <p className="muted small">
          XP {progress.xp} · 🔥 {streak} चालू streak
          {tab === 'pack' && ` · ${filteredCount} प्रश्न उपलब्ध`}
        </p>
      </div>

      {tab === 'speaking' ? (
        <div className="card" data-testid="speaking-card" role="tabpanel" id="drill-panel" aria-labelledby="drill-tabbtn-speaking">
          {!speakingPool.length ? (
            <p className="muted">या स्तरावर बोलणं prompt नाहीत.</p>
          ) : (
            <>
              <p className="muted small">
                {prompt.kind} · स्तर {prompt.level} · {`${(speakIdx % speakingPool.length) + 1}/${speakingPool.length}`}
              </p>
              <p className="story-text" data-testid="speak-text">{prompt.say_mr}</p>
              {settings.translit && prompt.say_translit ? <p className="muted">{prompt.say_translit}</p> : null}
              <p className="muted">{prompt.say_en}</p>
              {prompt.tip_en ? <p className="small">💡 {prompt.tip_en}</p> : null}
              {mic.transcript ? (
                <p data-testid="mic-transcript" role="status">🎤 “{mic.transcript}”</p>
              ) : null}
              {mic.micMsg ? (
                <p className="muted small" data-testid="mic-msg" role="status">{mic.micMsg}</p>
              ) : null}
              <div className="row">
                <button className="btn secondary small" data-testid="speak-listen" onClick={() => speak(prompt.say_mr, settings)}>
                  🔊 ऐका
                </button>
                {mic.supported ? (
                  mic.listening ? (
                    <button className="btn small" data-testid="mic-stop" onClick={mic.stop}>
                      ⏹ थांबा (8s guard)
                    </button>
                  ) : (
                    <button className="btn small" data-testid="mic-start" onClick={() => mic.start()}>
                      🎤 बोला
                    </button>
                  )
                ) : (
                  <span className="muted small">मायक उपलब्ध नाही — स्वतः गुण द्या.</span>
                )}
              </div>
              <div className="row" style={{ marginTop: '.5rem' }}>
                <button className="btn small" data-testid="speak-good" onClick={() => selfGrade(true)}>
                  ✓ मी बोललो (+10 XP)
                </button>
                <button className="btn secondary small" data-testid="speak-skip" onClick={() => selfGrade(false)}>
                  वगळा →
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card" key={round} data-testid="drill-card" role="tabpanel" id="drill-panel" aria-labelledby={`drill-tabbtn-${tab}`}>
          {!ex ? (
            <p className="muted">या स्तरावर प्रश्न नाहीत.</p>
          ) : (
            <>
              <div className="progress-bar" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <div style={{ width: `${pct}%` }} />
              </div>
              <p className="muted small">
                {TYPE_LABEL[ex.type]} · स्तर {ex.level} · प्रश्न {idx + 1}/{queue.length} · {ex.skill}
              </p>
              {ex.prompt_en ? <h3>{ex.prompt_en}</h3> : null}
              {ex.prompt_mr ? <p className="story-text">{ex.prompt_mr}</p> : null}

              {CHOICE_TYPES.includes(ex.type) && (
                <div className="opts">
                  {ex.choices.map((c, ci) => (
                    <button
                      key={`${c}-${ci}`}
                      className={`opt ${fb ? (c === ex.answer ? 'correct' : c === selected ? 'wrong' : '') : ''}`}
                      disabled={!!fb}
                      data-testid={`drill-opt-${c === ex.answer ? 'answer' : 'other'}`}
                      onClick={() => {
                        setSelected(c)
                        grade({ selected: c })
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {(ex.type === 'translate-en-mr' || ex.type === 'translate-mr-en') && (
                <div className="row">
                  <label className="field" style={{ flex: 2 }}>
                    तुमचं उत्तर
                    <input
                      data-testid="drill-input"
                      value={typed}
                      disabled={!!fb}
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') grade({ typed })
                      }}
                      placeholder={ex.type === 'translate-en-mr' ? 'मराठीत लिहा…' : 'Write in English…'}
                    />
                  </label>
                  <button className="btn" data-testid="drill-check" disabled={!!fb || !typed.trim()} onClick={() => grade({ typed })}>
                    तपासा
                  </button>
                </div>
              )}

              {ex.type === 'reorder' && !fb && <ReorderInput ex={ex} built={built} setBuilt={setBuilt} />}
              {ex.type === 'reorder' && !fb && (
                <div className="row" style={{ marginTop: '.5rem' }}>
                  <button
                    className="btn"
                    data-testid="drill-check"
                    disabled={built.length !== ex.choices.length}
                    onClick={() => grade({ built })}
                  >
                    तपासा
                  </button>
                </div>
              )}
              {ex.type === 'reorder' && fb && <p className="story-text">{built.join(' ')}</p>}

              <Feedback fb={fb} streak={streak} onNext={next} />
              {!fb && (
                <div className="row" style={{ marginTop: '.5rem' }}>
                  <button className="btn secondary small" data-testid="drill-new" onClick={() => newSession()}>
                    नवे 10 प्रश्न
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
