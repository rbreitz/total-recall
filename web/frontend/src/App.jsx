import { useEffect, useState, useCallback } from 'react'
import { getSessions } from './api'
import AnswerCompare from './components/AnswerCompare'
import MemoryBrowser from './components/MemoryBrowser'
import MemoryDiff from './components/MemoryDiff'

const TABS = [
  { id: 'compare', label: 'Answer Compare' },
  { id: 'memory', label: 'Memory Browser' },
  { id: 'diff', label: 'Memory Diff' },
]

export default function App() {
  const [sessions, setSessions] = useState([])
  const [error, setError] = useState(null)
  const [a, setA] = useState(1)
  const [b, setB] = useState(2)
  const [tab, setTab] = useState('compare')

  useEffect(() => {
    getSessions()
      .then((data) => {
        setSessions(data)
        if (data.length) {
          setA(data[0].n)
          setB(data[data.length > 1 ? 1 : 0].n)
        }
      })
      .catch((e) => setError(e.message))
  }, [])

  // ←/→ step session B through the available sessions (the "advance the demo" key).
  const step = useCallback(
    (dir) => {
      if (!sessions.length) return
      const ns = sessions.map((s) => s.n)
      const idx = ns.indexOf(b)
      const next = Math.min(Math.max(idx + dir, 0), ns.length - 1)
      setB(ns[next])
    },
    [sessions, b],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'SELECT') return
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  const sessionOptions = (value, onChange, label) => (
    <label className="picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {sessions.map((s) => (
          <option key={s.n} value={s.n}>
            Session {s.n} — {s.title}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <h1>Memory Agent, Visualized</h1>
            <p className="sub">Helios sales-engineer deal · Northwind Bank — what the agent learned between calls</p>
          </div>
        </div>
        <div className="pickers">
          {sessionOptions(a, setA, 'Session A')}
          <span className="vs">vs</span>
          {sessionOptions(b, setB, 'Session B')}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'diff' && <span className="headline-badge">headline</span>}
          </button>
        ))}
        <span className="hint">← / → steps Session B</span>
      </nav>

      <main className="content">
        {error && <div className="error-banner">Couldn’t load data — {error}</div>}
        {!error && tab === 'compare' && <AnswerCompare sessions={sessions} a={a} b={b} />}
        {!error && tab === 'memory' && <MemoryBrowser a={a} b={b} />}
        {!error && tab === 'diff' && <MemoryDiff from={a} to={b} />}
      </main>
    </div>
  )
}
