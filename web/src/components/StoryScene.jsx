// Generative SVG scene per story: picks palette + motif from story id hash.
const PALETTES = [
  { sky: '#bfe3ff', hill: '#8fd18f', sun: '#ffd93b' },
  { sky: '#ffe3b3', hill: '#a8d5a2', sun: '#ff9d3b' },
  { sky: '#d9ccff', hill: '#9fd8c9', sun: '#fff06b' },
  { sky: '#c2f0ff', hill: '#b5e08c', sun: '#ffb03b' },
]

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export default function StoryScene({ id, title }) {
  const h = hash(id || 'x')
  const pal = PALETTES[h % PALETTES.length]
  const motif = h % 4 // 0 house, 1 tree+cat, 2 rain cloud, 3 book/school
  return (
    <svg
      viewBox="0 0 320 140"
      className="story-scene"
      role="img"
      aria-label={title || 'story scene'}
      data-testid="story-scene"
    >
      <rect width="320" height="140" fill={pal.sky} rx="12" />
      <circle cx={262 - (h % 40)} cy={30} r={18} fill={pal.sun} />
      <ellipse cx="90" cy="105" rx="130" ry="55" fill={pal.hill} />
      <ellipse cx="260" cy="112" rx="110" ry="50" fill={pal.hill} opacity="0.75" />
      {motif === 0 && (
        <g>
          <rect x="120" y="62" width="60" height="44" fill="#fff" stroke="#8a5a2b" strokeWidth="3" />
          <polygon points="112,64 150,36 188,64" fill="#e2574c" />
          <rect x="143" y="82" width="16" height="24" fill="#8a5a2b" />
        </g>
      )}
      {motif === 1 && (
        <g>
          <rect x="140" y="70" width="14" height="40" fill="#8a5a2b" />
          <circle cx="147" cy="55" r="28" fill="#2f9e44" />
          <ellipse cx="205" cy="100" rx="20" ry="12" fill="#333" />
          <circle cx="205" cy="88" r="10" fill="#333" />
          <polygon points="197,82 200,72 204,81" fill="#333" />
          <polygon points="207,81 211,72 214,82" fill="#333" />
        </g>
      )}
      {motif === 2 && (
        <g>
          <ellipse cx="150" cy="50" rx="46" ry="20" fill="#fff" />
          <ellipse cx="120" cy="56" rx="26" ry="14" fill="#eef4ff" />
          {[110, 130, 150, 170, 190].map((x) => (
            <line key={x} x1={x} y1={72} x2={x - 6} y2={92} stroke="#339af0" strokeWidth="3" />
          ))}
        </g>
      )}
      {motif === 3 && (
        <g>
          <rect x="118" y="60" width="84" height="46" rx="4" fill="#fff" stroke="#3b5bdb" strokeWidth="3" />
          <line x1="160" y1="60" x2="160" y2="106" stroke="#3b5bdb" strokeWidth="3" />
          {[70, 80, 90].map((y) => (
            <line key={y} x1={126} y1={y} x2={152} y2={y} stroke="#adb5bd" strokeWidth="3" />
          ))}
          {[70, 80, 90].map((y) => (
            <line key={y} x1={168} y1={y} x2={194} y2={y} stroke="#adb5bd" strokeWidth="3" />
          ))}
        </g>
      )}
    </svg>
  )
}
