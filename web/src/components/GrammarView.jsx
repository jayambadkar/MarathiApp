import { useMemo, useState } from 'react'
import grammarData from '../data/grammar.json'
import { speak } from '../lib/store.js'
import { awardAnswer, shuffle, shuffleOptions } from '../lib/practice.js'
import Feedback from './Feedback.jsx'

const TOPICS = grammarData.topics
const TOTAL_Q = TOPICS.reduce((n, t) => n + t.quiz.length, 0)

export default function GrammarView({ settings, progress, setProgress }) {
  const [topicId, setTopicId] = useState(null)
  const [quizOn, setQuizOn] = useState(false)
  const [order, setOrder] = useState([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const [fb, setFb] = useState(null)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)

  const topic = TOPICS.find((t) => t.id === topicId)
  const q = quizOn && topic ? topic.quiz[order[idx]] : null
  // Memoized per question so options don't reshuffle mid-answer on re-render.
  // (Keyed on a primitive: q derives from quiz-order state, which useMemo deps dislike.)
  const qKey = quizOn && topic ? `${topic.id}:${order[idx]}` : 'none'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sq = useMemo(() => (q ? shuffleOptions(q.options, q.answer) : null), [qKey])

  function openTopic(id) {
    setTopicId(id)
    setQuizOn(false)
    setFb(null)
    setStreak(0)
    setScore(0)
  }

  function startQuiz() {
    if (!topic) return
    setOrder(shuffle(topic.quiz.map((_, i) => i)))
    setIdx(0)
    setPicked(null)
    setFb(null)
    setStreak(0)
    setScore(0)
    setQuizOn(true)
  }

  function grade(i) {
    if (fb || !q || !sq) return
    const ok = i === sq.answer
    awardAnswer(setProgress, 'grammar', ok)
    setStreak((s) => (ok ? s + 1 : 0))
    if (ok) setScore((s) => s + 1)
    setPicked(i)
    setFb({ ok, answer: ok ? '' : sq.options[sq.answer], explain: q.explain })
  }

  function next() {
    setFb(null)
    setPicked(null)
    if (idx + 1 < order.length) setIdx(idx + 1)
    else setQuizOn(false)
  }

  return (
    <div>
      <div className="card">
        <h2>व्याकरण — Grammar</h2>
        <p className="muted small">
          {TOPICS.length} विषय · {TOTAL_Q} प्रश्न · XP {progress.xp} · 🔥 {streak} streak
        </p>
        <div className="chips-row" role="tablist" aria-label="Grammar topics">
          {TOPICS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`grammar-tabbtn-${t.id}`}
              aria-selected={topicId === t.id}
              aria-controls="grammar-panel"
              className={`btn small ${topicId === t.id ? '' : 'secondary'}`}
              data-testid={`grammar-topic-${t.id}`}
              onClick={() => openTopic(t.id)}
            >
              {t.title_mr} ({t.quiz.length})
            </button>
          ))}
        </div>
      </div>

      {!topic ? (
        <div className="card">
          <p className="muted">वर विषय निवडा — नियम, तक्ता, उदाहरणं आणि प्रश्नमंजुषा दिसेल.</p>
        </div>
      ) : (
        <div className="card" data-testid="grammar-detail" role="tabpanel" id="grammar-panel" aria-labelledby={topicId ? `grammar-tabbtn-${topicId}` : undefined}>
          <h3>
            {topic.title_mr} <span className="muted small">{topic.title_en}</span>
          </h3>
          {!quizOn ? (
            <>
              <p>{topic.explanation_en}</p>
              <p>{topic.explanation_mr}</p>
              {topic.table && (
                <table className="gram" data-testid="grammar-table">
                  <thead>
                    <tr>{topic.table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {topic.table.rows.map((r, i) => (
                      <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              )}
              <h3>उदाहरणं · Examples</h3>
              <div className="opts">
                {topic.examples.map((e, i) => (
                  <div key={i} className="opt" style={{ cursor: 'default' }}>
                    <b>{e.mr}</b> — {e.en}
                    {settings.translit && e.tr ? <span className="muted"> · {e.tr}</span> : null}{' '}
                    <button
                      className="btn secondary small"
                      data-testid={`grammar-hear-${i}`}
                      onClick={() => speak(e.mr, settings)}
                      style={{ marginLeft: '.4rem' }}
                    >
                      🔊
                    </button>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: '.6rem' }}>
                <button className="btn" data-testid="grammar-start" onClick={startQuiz}>
                  प्रश्नमंजुषा सुरू करा ({topic.quiz.length} प्रश्न)
                </button>
                {score > 0 && <span className="muted small">मागील गुण: {score}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="progress-bar" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={order.length} aria-valuenow={idx}>
                <div style={{ width: `${Math.round((100 * idx) / order.length)}%` }} />
              </div>
              <p className="muted small">
                प्रश्न {idx + 1}/{order.length} · गुण {score}
              </p>
              <h3 data-testid="grammar-q">{q.q}</h3>
              {q.q_en ? <p className="muted">{q.q_en}</p> : null}
              <div className="opts">
                {sq.options.map((o, i) => (
                  <button
                    key={i}
                    className={`opt ${fb ? (i === sq.answer ? 'correct' : i === picked ? 'wrong' : '') : ''}`}
                    disabled={!!fb}
                    data-testid={`grammar-opt-${i === sq.answer ? 'answer' : 'other'}`}
                    onClick={() => grade(i)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <Feedback fb={fb} streak={streak} onNext={next} />
              {!fb && (
                <div className="row" style={{ marginTop: '.5rem' }}>
                  <button className="btn secondary small" data-testid="grammar-quit" onClick={() => setQuizOn(false)}>
                    सोडा · नियमांकडे
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
