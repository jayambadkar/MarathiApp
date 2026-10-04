import { useEffect, useRef, useState } from 'react'
import { CKEY, lsGet, lsSet, touchStreak } from '../lib/store.js'
import { isOnline, llmReply, offlineReply } from '../lib/chat.js'
import { listenOnce, speakMarathi, stopSpeak } from '../lib/speech.js'

const XP_CHAT_MSG = 2
const SEED = [
  {
    role: 'tutor',
    text: 'नमस्कार! 🙏 मी तुझा मराठी मित्र. मराठीत काहीतरी लिहा — मी मदत करेन! (Hello! I am your Marathi buddy. Write something in Marathi!)',
  },
]

export default function ChatView({ settings, progress, setProgress }) {
  void progress
  const [msgs, setMsgs] = useState(() => {
    const saved = lsGet(CKEY, null)
    return Array.isArray(saved) && saved.length ? saved : SEED
  })
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [micMsg, setMicMsg] = useState('')
  const [listening, setListening] = useState(false)
  const bottomRef = useRef(null)
  const online = isOnline(settings)

  useEffect(() => {
    lsSet(CKEY, msgs.slice(-100))
  }, [msgs])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, busy])

  function awardChat() {
    setProgress((p) => {
      const t = touchStreak(p)
      return {
        ...t,
        xp: t.xp + XP_CHAT_MSG,
        answers: t.answers + 1,
        byMode: { ...t.byMode, chat: (t.byMode.chat || 0) + XP_CHAT_MSG },
      }
    })
  }

  async function send(text) {
    const clean = (text || '').trim()
    if (!clean || busy) return
    setDraft('')
    setMicMsg('')
    const next = [...msgs, { role: 'user', text: clean }]
    setMsgs(next)
    awardChat()
    setBusy(true)
    try {
      let reply
      if (online) {
        try {
          reply = await llmReply(settings, next.slice(-12))
        } catch {
          reply = `${offlineReply(clean).text}\n\n(⚠️ online API failed — offline tutor answered.)`
        }
      } else {
        await new Promise((r) => setTimeout(r, 350))
        reply = offlineReply(clean).text
      }
      setMsgs((m) => [...m, { role: 'tutor', text: reply }])
    } finally {
      setBusy(false)
    }
  }

  function mic() {
    if (listening) return
    setListening(true)
    setMicMsg('🎤 ऐकतोय… बोला!')
    listenOnce({ lang: 'mr-IN', timeoutMs: 8000 }).then(
      ({ transcript }) => {
        setListening(false)
        if (transcript) {
          setDraft(transcript)
          setMicMsg('')
        } else setMicMsg('काही ऐकू आलं नाही — पुन्हा प्रयत्न करा.')
      },
      ({ code }) => {
        setListening(false)
        setMicMsg(
          code === 'unsupported'
            ? 'या ब्राउझरमध्ये mic नाही.'
            : code === 'timeout'
              ? 'वेळ संपली — पुन्हा प्रयत्न करा.'
              : 'काही ऐकू आलं नाही — पुन्हा प्रयत्न करा.',
        )
      },
    )
  }

  function clear() {
    stopSpeak()
    setMsgs(SEED)
    lsSet(CKEY, SEED)
  }

  return (
    <div className="card chat-card">
      <div className="mode-card-top">
        <h2 style={{ margin: 0 }}>
          गप्पा <span className="muted small">Chat Tutor</span>
        </h2>
        <span className="chip chip-net" data-on={online ? '1' : '0'} data-testid="chat-net">
          {online ? `online · ${settings.apiStyle || 'chat'}` : 'offline tutor'}
        </span>
      </div>
      <p className="muted small">
        {online
          ? `Online AI (${settings.model}) — corrections + conversation.`
          : 'Offline tutor — greetings, word help, gentle corrections. Add API key in Settings for online AI.'}
      </p>
      <div className="chat-log" data-testid="chat-log" role="log" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`} data-testid={`chat-msg-${i}`}>
            <span>{m.text}</span>
            {m.role === 'tutor' && (
              <button
                className="icon-btn small"
                data-testid={`chat-speak-${i}`}
                aria-label="Speak reply"
                onClick={() => {
                  stopSpeak()
                  speakMarathi(m.text, { voice: settings.voice, rate: settings.speed })
                }}
              >
                🔊
              </button>
            )}
          </div>
        ))}
        {busy && (
          <div className="chat-msg tutor typing" data-testid="chat-typing">
            लिहितोय…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {micMsg && (
        <p className="muted small" data-testid="chat-mic-msg" role="status">
          {micMsg}
        </p>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <input
          data-testid="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="मराठीत लिहा… (write in Marathi)"
          aria-label="Chat message"
        />
        <button type="button" className="btn secondary" data-testid="chat-mic" onClick={mic} title="बोला (speak)" aria-label="बोला — voice input">
          🎤
        </button>
        <button type="submit" className="btn" data-testid="chat-send" disabled={busy || !draft.trim()}>
          पाठवा →
        </button>
        <button type="button" className="btn secondary" data-testid="chat-clear" onClick={clear}>
          पुसा
        </button>
      </form>
      <p className="muted small">+{XP_CHAT_MSG} XP per message · history saved on this device (mt.chat.v1)</p>
    </div>
  )
}
