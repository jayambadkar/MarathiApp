import { useEffect, useMemo, useRef, useState } from 'react'
import stories from '../data/stories.json'
import { awardAnswer, shuffleOptions } from '../lib/practice.js'
import { chunkText, speakMarathi, stopSpeak } from '../lib/speech.js'
import Feedback from './Feedback.jsx'
import StoryScene from './StoryScene.jsx'

const XP_STORY_DONE = 15

function sentences(mr) {
  return chunkText(mr, 400)
}

function glossMap(story) {
  const m = new Map()
  for (const g of story.gloss || []) m.set(g.mr, g.en)
  return m
}

function Reader({ story, settings, setProgress, onBack }) {
  const [showEn, setShowEn] = useState(false)
  const [active, setActive] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [kara, setKara] = useState(false)
  const [qi, setQi] = useState(0)
  const [fb, setFb] = useState(null)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState(null)
  const [earned, setEarned] = useState(0)
  const gm = useMemo(() => glossMap(story), [story])
  const sents = useMemo(() => sentences(story.text_mr), [story])
  const mounted = useRef(true)
  const karaTimer = useRef(null)
  const playSeq = useRef(0)

  function clearKara() {
    if (karaTimer.current) {
      clearInterval(karaTimer.current)
      karaTimer.current = null
    }
  }

  // Timed highlight fallback when TTS is missing; tracked so stop/unmount clears it.
  function fallbackKara(my) {
    clearKara()
    setKara(true)
    let i = 0
    setActive(0)
    karaTimer.current = setInterval(() => {
      i++
      if (!mounted.current || playSeq.current !== my || i >= sents.length) {
        clearKara()
        if (mounted.current && playSeq.current === my) {
          setKara(false)
          setActive(-1)
        }
        return
      }
      setActive(i)
    }, 1600)
  }

  useEffect(() => {
    mounted.current = true
    function onStop() {
      playSeq.current++
      clearKara()
      setPlaying(false)
      setKara(false)
      setActive(-1)
    }
    window.addEventListener('mt-speak-stop', onStop)
    return () => {
      mounted.current = false
      clearInterval(karaTimer.current)
      karaTimer.current = null
      window.removeEventListener('mt-speak-stop', onStop)
      stopSpeak()
    }
  }, [story.id])

  function readAlong() {
    if (playing || kara) {
      playSeq.current++
      stopSpeak()
      clearKara()
      setPlaying(false)
      setKara(false)
      setActive(-1)
      return
    }
    // Generation guard: late audio callbacks must not restart karaoke
    // after the user pressed stop or moved to another story.
    const my = ++playSeq.current
    const live = () => mounted.current && playSeq.current === my
    setPlaying(true)
    const ok = speakMarathi(story.text_mr, {
      rate: settings.speed,
      chunkMax: 400,
      onChunk: (i) => live() && setActive(i),
      onDone: () => {
        if (!live()) return
        setPlaying(false)
        setActive(-1)
      },
      onError: () => {
        if (!live()) return
        setPlaying(false)
        fallbackKara(my)
      },
    })
    if (!ok) {
      setPlaying(false)
      fallbackKara(my)
    }
  }

  const readActive = playing || kara

  function renderKaraoke() {
    return sents.map((s, i) => {
      const words = s.split(/\s+/)
      return (
        <span key={i} data-testid={`karaoke-sent-${i}`} className={i === active ? 'karaoke-on' : ''}>
          {words.map((w, j) => {
            const clean = w.replace(/[।.,?!]/g, '')
            const en = gm.get(clean) || gm.get(w)
            return (
              <span key={j}>
                {en ? (
                  <span className="glossed" title={en} tabIndex={0}>
                    {w}
                  </span>
                ) : (
                  w
                )}
                {j < words.length - 1 ? ' ' : ''}
              </span>
            )
          })}
          {i < sents.length - 1 ? ' ' : ''}
        </span>
      )
    })
  }

  const q = (story.questions || [])[qi]
  // Memoized per question (stable JSON reference) so options don't reshuffle mid-answer.
  const sq = useMemo(() => (q ? shuffleOptions(q.options, q.answer) : null), [q])

  function answer(idx) {
    if (fb || !q || !sq) return
    const ok = idx === sq.answer
    setPicked(idx)
    if (ok) setEarned((e) => e + XP_STORY_DONE)
    awardAnswer(setProgress, 'stories', ok, XP_STORY_DONE)
    setStreak((s) => (ok ? s + 1 : 0))
    setFb({ ok, answer: ok ? '' : sq.options[sq.answer] })
  }

  function nextQ() {
    setFb(null)
    setPicked(null)
    if (qi + 1 < (story.questions || []).length) setQi(qi + 1)
    else setDone(true)
  }

  return (
    <div>
      <div className="row">
        <button className="btn small secondary" data-testid="story-back" onClick={onBack}>
          ← सर्व गोष्टी
        </button>
        <span className="chip">L{story.level}</span>
      </div>
      <StoryScene id={story.id} title={story.title_en} />
      <h2>
        {story.title_mr} <span className="muted small">{story.title_en}</span>
      </h2>
      <div className="row">
        <button className="btn small" data-testid="read-along" aria-pressed={readActive} onClick={readAlong}>
          {readActive ? '⏹ थांबा' : '▶ ऐका + वाचा (Read-along)'}
        </button>
        <label className="small">
          <input
            type="checkbox"
            data-testid="toggle-en"
            checked={showEn}
            onChange={(e) => setShowEn(e.target.checked)}
          />{' '}
          English दाखवा
        </label>
      </div>
      <p className="story-text" data-testid="story-text">
        {renderKaraoke()}
      </p>
      {showEn && (
        <p className="muted" data-testid="story-en">
          {story.text_en}
        </p>
      )}
      {(story.gloss || []).length > 0 && (
        <details className="discuss">
          <summary data-testid="gloss-toggle">
            शब्दार्थ ({(story.gloss || []).length} words)
          </summary>
          <p>
            {(story.gloss || []).map((g) => (
              <span key={g.mr} className="srs-box" title={g.en}>
                {g.mr} = {g.en}
              </span>
            ))}
          </p>
        </details>
      )}
      <h3>प्रश्न — Quiz</h3>
      {!q && <p className="muted">या गोष्टीला प्रश्न नाहीत.</p>}
      {q && !done && (
        <div data-testid="story-quiz">
          <p>
            <b>
              {q.q_mr}{' '}
              <span className="muted small">
                ({q.q_en}) · {qi + 1}/{(story.questions || []).length}
              </span>
            </b>
          </p>
          <div className="chips-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            {sq.options.map((op, idx) => (
              <button
                key={idx}
                className={`opt${picked === idx ? (idx === sq.answer ? ' correct' : ' wrong') : ''}`}
                data-testid={`story-opt-${idx}`}
                disabled={Boolean(fb)}
                onClick={() => answer(idx)}
              >
                {op}
              </button>
            ))}
          </div>
          <Feedback fb={fb} streak={streak} onNext={nextQ} />
        </div>
      )}
      <details className="discuss">
        <summary>चर्चा करा — Discuss 💬</summary>
        <p>
          {story.title_mr} आवडली का? आवडता भाग कोणता? / Did you like “{story.title_en}”? Which part
          was your favourite, and why? एका मित्राला ही गोष्ट दोन वाक्यांत सांगून दाखव!
        </p>
      </details>
      {done && (
        <div className="celebrate" data-testid="celebrate" role="status">
          <div className="celebrate-inner">
            <div className="celebrate-emoji">🎉</div>
            <h3>अभिनंदन! Story complete!</h3>
            <p>
              +{earned} XP · {story.title_mr} पूर्ण 🎊
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn small" onClick={onBack}>
                आणखी गोष्टी →
              </button>
            </div>
          </div>
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} style={{ '--d': `${(i % 8) * 0.25}s`, '--x': `${(i * 37) % 220 - 110}px` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StoriesView({ settings, progress, setProgress }) {
  void progress
  const [level, setLevel] = useState('all')
  const [openId, setOpenId] = useState(null)
  const levels = useMemo(() => [...new Set(stories.map((s) => s.level))].sort(), [])
  const list = stories.filter((s) => level === 'all' || s.level === Number(level))
  const story = openId ? stories.find((s) => s.id === openId) : null

  if (story)
    return (
      <div className="card">
        <Reader story={story} settings={settings} setProgress={setProgress} onBack={() => setOpenId(null)} />
      </div>
    )

  return (
    <div>
      <div className="card">
        <h2>गोष्टी — Stories</h2>
        <p className="muted small">
          {stories.length} leveled tales with read-along audio, word meanings and quizzes.
        </p>
        <div className="row" role="group" aria-label="Level filter">
          <button
            className={`btn small${level === 'all' ? '' : ' secondary'}`}
            data-testid="lvl-all"
            aria-pressed={level === 'all'}
            onClick={() => setLevel('all')}
          >
            सर्व
          </button>
          {levels.map((l) => (
            <button
              key={l}
              className={`btn small${level === String(l) ? '' : ' secondary'}`}
              data-testid={`lvl-${l}`}
              aria-pressed={level === String(l)}
              onClick={() => setLevel(String(l))}
            >
              L{l}
            </button>
          ))}
        </div>
      </div>
      <div className="cards2" data-testid="story-grid">
        {list.map((s) => (
          <button
            key={s.id}
            className="card mode-card story-card"
            data-testid={`story-${s.id}`}
            onClick={() => setOpenId(s.id)}
          >
            <StoryScene id={s.id} title={s.title_en} />
            <h3>
              {s.title_mr} <span className="muted small">L{s.level}</span>
            </h3>
            <p className="muted small">{s.title_en}</p>
            <p className="small">{(s.questions || []).length} प्रश्न · {(s.gloss || []).length} शब्द</p>
          </button>
        ))}
      </div>
    </div>
  )
}
