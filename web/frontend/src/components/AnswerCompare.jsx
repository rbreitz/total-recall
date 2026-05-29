import { useMemo } from 'react'
import { diffWords } from '../lib/wordDiff'

// Two answers side by side. Session B's words that are new relative to A are
// highlighted — the "it got sharper" moment.
export default function AnswerCompare({ sessions, a, b }) {
  const sa = sessions.find((s) => s.n === a)
  const sb = sessions.find((s) => s.n === b)

  const bTokens = useMemo(
    () => (sa && sb ? diffWords(sa.answer, sb.answer) : []),
    [sa, sb],
  )

  if (!sa || !sb) return <div className="empty">Pick two sessions to compare.</div>

  const sameQuestion = sa.question === sb.question

  return (
    <div className="compare">
      <div className="question-bar">
        <span className="q-label">Question</span>
        {sameQuestion ? (
          <span className="q-text">{sa.question}</span>
        ) : (
          <span className="q-text q-diff">A: {sa.question} &nbsp;·&nbsp; B: {sb.question}</span>
        )}
      </div>

      <div className="cols">
        <section className="col">
          <h2>
            <span className="pill">A</span> Session {sa.n} — {sa.title}
          </h2>
          <div className="answer">{sa.answer}</div>
        </section>

        <section className="col col-b">
          <h2>
            <span className="pill pill-b">B</span> Session {sb.n} — {sb.title}
            <span className="legend">new vs A highlighted</span>
          </h2>
          <div className="answer">
            {bTokens.map((tok, i) =>
              tok.op === 'insert' ? (
                <mark key={i}>{tok.text}</mark>
              ) : (
                <span key={i}>{tok.text}</span>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
