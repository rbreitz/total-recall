import { useEffect, useState } from 'react'
import { getDiff } from '../api'

const STATUS_ORDER = { added: 0, modified: 1, removed: 2, unchanged: 3 }

function UnifiedDiff({ text }) {
  const lines = (text || '').split('\n')
  return (
    <pre className="unified">
      {lines.map((line, i) => {
        let cls = 'ctx'
        if (line.startsWith('+') && !line.startsWith('+++')) cls = 'add'
        else if (line.startsWith('-') && !line.startsWith('---')) cls = 'del'
        else if (line.startsWith('@@')) cls = 'hunk'
        else if (line.startsWith('+++') || line.startsWith('---')) cls = 'meta'
        return (
          <div key={i} className={`dl ${cls}`}>
            {line || ' '}
          </div>
        )
      })}
    </pre>
  )
}

function FileRow({ entry }) {
  const [open, setOpen] = useState(entry.status === 'added' || entry.status === 'modified')
  const expandable = entry.status === 'modified' || entry.status === 'added' || entry.status === 'removed'
  return (
    <div className={`diff-file ${entry.status}`}>
      <button className="diff-file-head" onClick={() => expandable && setOpen(!open)}>
        <span className={`tag ${entry.status}`}>{entry.status}</span>
        <span className="diff-path">{entry.path}</span>
        {expandable && <span className="caret">{open ? '▾' : '▸'}</span>}
      </button>
      {open && entry.status === 'modified' && <UnifiedDiff text={entry.unified} />}
      {open && entry.status === 'added' && (
        <pre className="unified all-add">
          {(entry.to_content || '').split('\n').map((l, i) => (
            <div key={i} className="dl add">{'+ ' + (l || ' ')}</div>
          ))}
        </pre>
      )}
      {open && entry.status === 'removed' && (
        <pre className="unified all-del">
          {(entry.from_content || '').split('\n').map((l, i) => (
            <div key={i} className="dl del">{'- ' + (l || ' ')}</div>
          ))}
        </pre>
      )}
    </div>
  )
}

export default function MemoryDiff({ from, to }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    setData(null)
    if (from === to) {
      setError('Pick two different sessions to see what changed.')
      return
    }
    getDiff(from, to)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [from, to])

  if (error) return <div className="error-banner">{error}</div>
  if (!data) return <div className="empty">Computing diff…</div>

  const files = [...data.files].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.path.localeCompare(b.path),
  )
  const s = data.summary

  return (
    <div className="diff">
      <div className="diff-summary">
        <span className="headline-line">
          What the agent learned between Session {from} and Session {to}
        </span>
        <div className="chips">
          <span className="chip add">+{s.added} added</span>
          <span className="chip mod">~{s.modified} modified</span>
          <span className="chip del">−{s.removed} removed</span>
          <span className="chip unc">{s.unchanged} unchanged</span>
        </div>
      </div>

      {s.added + s.modified + s.removed === 0 ? (
        <div className="empty">
          No memory changed — the agent did not overwrite anything between these sessions.
        </div>
      ) : (
        <div className="diff-list">
          {files
            .filter((f) => f.status !== 'unchanged')
            .map((f) => (
              <FileRow key={f.path} entry={f} />
            ))}
        </div>
      )}

      {s.unchanged > 0 && (
        <details className="unchanged-fold">
          <summary>{s.unchanged} unchanged file(s)</summary>
          <div className="diff-list">
            {files
              .filter((f) => f.status === 'unchanged')
              .map((f) => (
                <FileRow key={f.path} entry={f} />
              ))}
          </div>
        </details>
      )}
    </div>
  )
}
