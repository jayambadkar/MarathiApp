import { useEffect, useRef, useState } from 'react'
import { speakMarathi, stopSpeak } from '../lib/speech.js'

/** Floating "🔊 वाचा" popover for any selected text on the page. */
export default function SelectionSpeak({ settings }) {
  const [sel, setSel] = useState(null)
  const [state, setState] = useState('idle') // idle | playing | error
  const btnRef = useRef(null)

  useEffect(() => {
    let t = null
    function update() {
      clearTimeout(t)
      t = setTimeout(() => {
        try {
          const s = window.getSelection()
          const text = (s?.toString() || '').trim()
          if (text.length >= 2 && text.length <= 600 && s.rangeCount) {
            const r = s.getRangeAt(0).getBoundingClientRect()
            setSel({ text, x: Math.min(r.left + r.width / 2, window.innerWidth - 90), y: r.bottom + 8 })
            setState((st) => (st === 'playing' ? st : 'idle'))
          } else {
            setSel(null)
            setState('idle')
          }
        } catch {
          setSel(null)
          setState('idle')
        }
      }, 120)
    }
    document.addEventListener('mouseup', update)
    document.addEventListener('selectionchange', update)
    const onStop = () => setState('idle')
    window.addEventListener('mt-speak-stop', onStop)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mouseup', update)
      document.removeEventListener('selectionchange', update)
      window.removeEventListener('mt-speak-stop', onStop)
    }
  }, [])

  if (!sel) return null
  const label = state === 'playing' ? '⏹ थांबा' : state === 'error' ? '🔇 परत प्रयत्न करा' : '🔊 वाचा'
  return (
    <button
      ref={btnRef}
      className="sel-pop"
      data-testid="sel-pop"
      data-state={state}
      style={{ display: 'block', left: sel.x, top: sel.y }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (state === 'playing') {
          stopSpeak()
          setState('idle')
          return
        }
        setState('playing')
        const ok = speakMarathi(sel.text, {
          rate: settings.speed,
          onDone: () => setState('idle'),
          onError: () => setState('error'),
        })
        if (!ok) setState('error')
      }}
    >
      {label}
    </button>
  )
}
