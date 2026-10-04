import { useEffect, useRef, useState } from 'react'
import { MODES } from '../data/modes.js'
import { ModeIcon } from '../data/modes.jsx'
import { getAnim } from '../lib/anim.js'

const CARDS = {
  chat: 'Free Marathi conversation with corrections. Talk about anything and get fixed in real time.',
  sprint: 'Timed reading races with WPM scores and level targets from 40 to 140 WPM.',
  stories: 'Leveled tales with animated scenes, audio, karaoke read-along and quizzes.',
  drills: 'Adaptive Duolingo-style sentence, speaking and listening workouts that level up with you.',
  grammar: 'Gender, plurals, postpositions and verbs — rules, tables, examples and quiz items.',
  vocab: 'Two-way EN↔MR flashcards with spaced repetition.',
  progress: 'XP, daily streaks, accuracy and per-mode stats.',
  settings: 'Model, API key + style, level, voice, speed, theme and data controls.',
  help: 'Full how-to guide for every part of the app.',
}

export default function ModesGallery({ onNav }) {
  const [scene, setScene] = useState('cat')
  const [stats, setStats] = useState(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const anim = getAnim()
    if (anim && sceneRef.current) anim.render(sceneRef.current, scene)
    return () => {
      try {
        getAnim()?.stop?.()
      } catch {
        /* no anim */
      }
    }
  }, [scene])

  // Counts load lazily so the gallery chunk doesn't bundle all JSON data.
  useEffect(() => {
    let on = true
    Promise.all([
      import('../data/stories.json'),
      import('../data/sprints.json'),
      import('../data/vocab.json'),
      import('../data/drills.json'),
      import('../data/grammar.json'),
      import('../data/speaking.json'),
    ]).then(([stories, sprints, vocab, drills, grammar, speaking]) => {
      if (!on) return
      setStats({
        counts: [
          ['Stories', stories.default.length],
          ['Sprints', sprints.default.length],
          ['Vocab words', vocab.default.length],
          ['Drill exercises', drills.default.exercises.length],
          ['Grammar topics', grammar.default.topics.length],
          ['Speaking prompts', speaking.default.length],
        ],
        firstStory: stories.default[0]?.title_mr || '',
        firstWord: vocab.default[0] || null,
      })
    }).catch(() => {
      /* offline stats unavailable */
    })
    return () => {
      on = false
    }
  }, [])

  return (
    <>
      <div className="cards2">
        {MODES.filter((m) => m.id !== 'modes').map((m) => (
          <div className="card mode-card" key={m.id}>
            <div className="mode-card-top">
              <ModeIcon id={m.id} size={20} />
              <h3>
                {m.mr} <span className="muted small">{m.en}</span>
              </h3>
            </div>
            <p>{CARDS[m.id] || m.desc}</p>
            <p className="muted small">{m.best}</p>
            <button className="btn small" data-go={m.id} onClick={() => onNav(m.id)}>
              सुरू करा →
            </button>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Animated scenes (offline)</h3>
        <div ref={sceneRef} data-testid="anim-scene" />
        <div className="row">
          {['cat', 'mango', 'school', 'diwali'].map((s) => (
            <button
              key={s}
              className={s === scene ? 'btn small' : 'btn small secondary'}
              onClick={() => setScene(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Offline data (bundled)</h3>
        {!stats ? (
          <p className="muted small">माहिती लोड होतेय…</p>
        ) : (
          <>
            {stats.counts.map(([label, n]) => (
              <div className="kv" key={label}>
                <span>{label}</span>
                <span>{n}</span>
              </div>
            ))}
            <p className="muted small">
              Font: Baloo 2 (offline). First story: {stats.firstStory} · First word:{' '}
              {stats.firstWord ? `${stats.firstWord.mr} (${stats.firstWord.en})` : '—'}
            </p>
          </>
        )}
      </div>
    </>
  )
}
