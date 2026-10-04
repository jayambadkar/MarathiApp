import { MODES } from '../data/modes.js'
import { ModeIcon } from '../data/modes.jsx'

export default function Sidebar({ mode, onNav, open }) {
  return (
    <aside className={open ? 'sidebar open' : 'sidebar'} id="sidebar">
      <nav aria-label="Modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-mode={m.id}
            className={m.id === mode ? 'nav-btn active' : 'nav-btn'}
            aria-current={m.id === mode ? 'page' : undefined}
            onClick={() => onNav(m.id)}
          >
            <ModeIcon id={m.id} />
            <span className="nav-text">
              <span className="nav-mr">{m.mr}</span>
              <span className="nav-en">{m.en}</span>
              <span className="nav-desc">{m.desc}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
