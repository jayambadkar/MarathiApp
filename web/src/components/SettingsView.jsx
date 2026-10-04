import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, speak, wipeAll } from '../lib/store.js'

export default function SettingsView({ settings, setSettings }) {
  const [draft, setDraft] = useState(settings)
  const [voices, setVoices] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    function load() {
      try {
        setVoices(typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() || [] : [])
      } catch {
        setVoices([])
      }
    }
    load()
    try {
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.addEventListener) {
        speechSynthesis.addEventListener('voiceschanged', load)
        return () => speechSynthesis.removeEventListener('voiceschanged', load)
      }
    } catch {
      /* no TTS */
    }
  }, [])

  function set(k, v) {
    setDraft((d) => ({ ...d, [k]: v }))
    setMsg('')
  }

  function save() {
    const saved = {
      ...draft,
      model: (draft.model || '').trim() || DEFAULT_SETTINGS.model,
      apiBase: (draft.apiBase || '').trim(),
      apiKey: (draft.apiKey || '').trim(),
      level: parseInt(draft.level, 10) || 1,
      speed: parseFloat(draft.speed) || 1,
    }
    setSettings(saved)
    setDraft(saved)
    setMsg('जतन झालं ✓')
  }

  function wipe() {
    wipeAll()
    window.location.reload()
  }

  return (
    <div className="card">
      <h2>सेटिंग्ज — Settings</h2>
      <div className="row">
        <label className="field">
          Model
          <input id="sModel" value={draft.model} onChange={(e) => set('model', e.target.value)} />
        </label>
        <label className="field">
          API Base (OpenAI-compatible)
          <input
            id="sBase"
            placeholder="https://api.example.com/v1"
            value={draft.apiBase}
            onChange={(e) => set('apiBase', e.target.value)}
          />
        </label>
        <label className="field">
          API Style
          <select
            id="sStyle"
            value={draft.apiStyle || 'chat'}
            onChange={(e) => set('apiStyle', e.target.value)}
          >
            <option value="chat">chat/completions</option>
            <option value="responses">responses</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="field">
          API Key
          <input
            id="sKey"
            type="password"
            value={draft.apiKey}
            placeholder="(रिकामं = offline)"
            onChange={(e) => set('apiKey', e.target.value)}
          />
        </label>
        <label className="field">
          स्तर Level
          <select
            id="sLvl"
            value={String(draft.level)}
            onChange={(e) => set('level', e.target.value)}
          >
            <option value="1">L1</option>
            <option value="2">L2</option>
            <option value="3">L3</option>
            <option value="4">L4</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="field">
          Voice
          <select
            id="sVoice"
            value={draft.voice}
            onChange={(e) => set('voice', e.target.value)}
          >
            <option value="">default</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Speed
          <select id="sSpd" value={String(draft.speed)} onChange={(e) => set('speed', e.target.value)}>
            <option value="0.6">0.6x</option>
            <option value="1">1x</option>
            <option value="1.3">1.3x</option>
          </select>
        </label>
        <label className="field">
          Theme
          <select
            id="sTheme"
            value={draft.theme}
            onChange={(e) => set('theme', e.target.value)}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="small">
          <input
            type="checkbox"
            id="sTr"
            checked={Boolean(draft.translit)}
            onChange={(e) => set('translit', e.target.checked)}
          />{' '}
          transliteration दाखवा
        </label>
      </div>
      <div className="row" style={{ marginTop: '.6rem' }}>
        <button className="btn" id="sSave" onClick={save}>
          जतन करा (Save)
        </button>
        <button
          className="btn secondary"
          id="sTest"
          onClick={() => speak('नमस्कार! मी मराठी शिकवते.', draft)}
        >
          🔊 चाचणी
        </button>
        <button className="btn secondary" id="sWipe" onClick={wipe}>
          सर्व डेटा पुसा
        </button>
      </div>
      <p className="muted small" id="sMsg" role="status">
        {msg}
      </p>
    </div>
  )
}
