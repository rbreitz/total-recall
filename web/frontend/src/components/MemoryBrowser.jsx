import { useEffect, useMemo, useState } from 'react'
import { getMemory } from '../api'

// Group flat /dir/file.md paths into a one-level tree for display.
function groupByDir(files) {
  const tree = {}
  for (const f of files) {
    const parts = f.path.replace(/^\//, '').split('/')
    const dir = parts.length > 1 ? '/' + parts.slice(0, -1).join('/') : '/'
    ;(tree[dir] ||= []).push(f)
  }
  return Object.entries(tree).sort(([x], [y]) => x.localeCompare(y))
}

export default function MemoryBrowser({ a, b }) {
  const [which, setWhich] = useState(b)
  const [files, setFiles] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)

  // Default to whichever session B is when the selection changes upstream.
  useEffect(() => setWhich(b), [b])

  useEffect(() => {
    setError(null)
    setFiles(null)
    getMemory(which)
      .then((res) => {
        setFiles(res.files)
        setSelected(res.files[0]?.path ?? null)
      })
      .catch((e) => setError(e.message))
  }, [which])

  const grouped = useMemo(() => (files ? groupByDir(files) : []), [files])
  const current = files?.find((f) => f.path === selected)

  return (
    <div className="browser">
      <div className="browser-head">
        <span className="mount">/mnt/memory/</span>
        <div className="seg">
          <button className={which === a ? 'on' : ''} onClick={() => setWhich(a)}>
            Session {a}
          </button>
          <button className={which === b ? 'on' : ''} onClick={() => setWhich(b)}>
            Session {b}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {files && (
        <div className="browser-body">
          <aside className="tree">
            {grouped.map(([dir, items]) => (
              <div key={dir} className="tree-dir">
                <div className="dir-name">{dir}</div>
                {items.map((f) => {
                  const name = f.path.split('/').pop()
                  return (
                    <button
                      key={f.path}
                      className={`file ${selected === f.path ? 'sel' : ''}`}
                      onClick={() => setSelected(f.path)}
                    >
                      <span>{name}</span>
                      <span className="chars">{f.char_count}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </aside>
          <article className="file-view">
            {current ? (
              <>
                <div className="file-path">{current.path}</div>
                <pre>{current.content}</pre>
              </>
            ) : (
              <div className="empty">This snapshot has no memories yet.</div>
            )}
          </article>
        </div>
      )}
    </div>
  )
}
