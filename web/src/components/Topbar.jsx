export default function Topbar({ settings, progress, menuOpen, onMenu }) {
  const online = Boolean(settings.apiBase && settings.apiKey)
  return (
    <header className="topbar">
      <button
        id="menuBtn"
        className="icon-btn only-mobile"
        aria-label="Menu"
        aria-expanded={Boolean(menuOpen)}
        aria-controls="sidebar"
        onClick={onMenu}
      >
        ☰
      </button>
      <div className="brand">
        <span className="brand-mr">मराठी शिका</span>
        <span className="brand-en">Marathi Tutor</span>
      </div>
      <div className="chips">
        <span id="levelChip" className="chip">
          L{settings.level}
        </span>
        <span id="xpChip" className="chip chip-xp">
          {progress.xp} XP
        </span>
        <span id="streakChip" className="chip">
          🔥 {progress.streak}
        </span>
        <span
          id="netChip"
          className="chip chip-net"
          title="API key present?"
          data-on={online ? '1' : '0'}
        >
          {online ? 'online' : 'offline'}
        </span>
      </div>
    </header>
  )
}
