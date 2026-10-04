import { useEffect, useRef, useState } from 'react'
import { speakMarathi, stopSpeak } from '../lib/speech.js'

/** Floating "🔊 वाचा" popover for any selected text on the page. */
export default function SelectionSpeak({ settings }) {
  const [sel, setSel] = useState(null)
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
          } else {
            setSel(null)
          }
        } catch {
          setSel(null)
        }
      }, 120)
    }
    document.addEventListener('mouseup', update)
    document.addEventListener('selectionchange', update)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mouseup', update)
      document.removeEventListener('selectionchange', update)
    }
  }, [])

  if (!sel) return null
  return (
    <button
      ref={btnRef}
      className="sel-pop"
      data-testid="sel-pop"
      style={{ display: 'block', left: sel.x, top: sel.y }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        stopSpeak()
        speakMarathi(sel.text, { voice: settings.voice, rate: settings.speed })
      }}
    >
      🔊 वाचा
    </button>
  )
}
