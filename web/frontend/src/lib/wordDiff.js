// Lightweight word-level diff for the Answer Compare view. Returns the tokens
// of `b` tagged equal/insert relative to `a`, so the "what got sharper" words
// in session B can be highlighted. LCS dynamic programming — answers are a few
// hundred words, so this is plenty fast.

function tokenize(text) {
  // Keep whitespace as tokens so we can rebuild the string exactly.
  return text.match(/\s+|\S+/g) || []
}

export function diffWords(a, b) {
  const A = tokenize(a)
  const B = tokenize(b)
  const n = A.length
  const m = B.length

  // LCS length table.
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // Walk the table to tag each token of B.
  const out = []
  let i = 0
  let j = 0
  while (j < m) {
    if (i < n && A[i] === B[j]) {
      out.push({ text: B[j], op: 'equal' })
      i++
      j++
    } else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) {
      i++ // token only in A (deleted) — not shown in B column
    } else {
      out.push({ text: B[j], op: 'insert' })
      j++
    }
  }
  return out
}
