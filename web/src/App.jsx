import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { MODES } from './data/modes.js'
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  PKEY,
  lsSet,
  touchStreak,
  useLocalStorage,
} from './lib/store.js'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import SelectionSpeak from './components/SelectionSpeak.jsx'

// Code-split: each mode view (+ its JSON data) loads on demand so the
// initial bundle stays small. Topbar/Sidebar stay in the main chunk.
const ModesGallery = lazy(() => import('./components/ModesGallery.jsx'))
const HelpView = lazy(() => import('./components/HelpView.jsx'))
const ProgressView = lazy(() => import('./components/ProgressView.jsx'))
const SettingsView = lazy(() => import('./components/SettingsView.jsx'))
const DrillsView = lazy(() => import('./components/DrillsView.jsx'))
const VocabView = lazy(() => import('./components/VocabView.jsx'))
const GrammarView = lazy(() => import('./components/GrammarView.jsx'))
const SprintsView = lazy(() => import('./components/SprintsView.jsx'))
const StoriesView = lazy(() => import('./components/StoriesView.jsx'))
const ChatView = lazy(() => import('./components/ChatView.jsx'))

const MODE_IDS = MODES.map((m) => m.id)

function App() {
  const [mode, setMode] = useState('modes')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settings, setSettings] = useLocalStorage('mt.settings.v1', DEFAULT_SETTINGS)
  const [progress, setProgress] = useLocalStorage('mt.progress.v1', DEFAULT_PROGRESS)
  const viewRef = useRef(null)

  useEffect(() => {
    setProgress((p) => {
      const touched = touchStreak(p)
      if (touched !== p) lsSet(PKEY, touched)
      return touched
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      settings.theme === 'dark' ? 'dark' : 'light',
    )
  }, [settings.theme])

  function nav(next) {
    setMode(MODE_IDS.includes(next) ? next : 'modes')
    setSidebarOpen(false)
    viewRef.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <Topbar
        settings={settings}
        progress={progress}
        menuOpen={sidebarOpen}
        onMenu={() => setSidebarOpen((o) => !o)}
      />
      <div className="layout">
        <Sidebar mode={mode} onNav={nav} open={sidebarOpen} />
        <main id="view" className="view" data-mode={mode} tabIndex={-1} ref={viewRef}>
          <Suspense fallback={<p className="muted" data-testid="view-loading">लोड होतंय… Loading…</p>}>
          {mode === 'modes' && <ModesGallery onNav={nav} />}
          {mode === 'help' && <HelpView />}
          {mode === 'progress' && <ProgressView progress={progress} setProgress={setProgress} />}
          {mode === 'settings' && <SettingsView settings={settings} setSettings={setSettings} />}
          {mode === 'drills' && <DrillsView settings={settings} progress={progress} setProgress={setProgress} />}
          {mode === 'vocab' && <VocabView settings={settings} progress={progress} setProgress={setProgress} />}
          {mode === 'grammar' && <GrammarView settings={settings} progress={progress} setProgress={setProgress} />}
          {mode === 'sprint' && <SprintsView settings={settings} progress={progress} setProgress={setProgress} />}
          {mode === 'stories' && <StoriesView settings={settings} progress={progress} setProgress={setProgress} />}
          {mode === 'chat' && <ChatView settings={settings} progress={progress} setProgress={setProgress} />}
          </Suspense>
        </main>
      </div>
      <SelectionSpeak settings={settings} />
    </>
  )
}

export default App
