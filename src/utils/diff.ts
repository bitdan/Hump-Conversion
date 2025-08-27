import type { DiffResult, DiffHunk, LineChange } from './diffTypes'

function splitLines(input: string): string[] {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

export function diffLines(oldText: string, newText: string): DiffResult {
  const a = splitLines(oldText)
  const b = splitLines(newText)

  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const changes: LineChange[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      changes.push({ type: 'context', value: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      changes.push({ type: 'remove', value: a[i] })
      i++
    } else {
      changes.push({ type: 'add', value: b[j] })
      j++
    }
  }
  while (i < n) {
    changes.push({ type: 'remove', value: a[i++] })
  }
  while (j < m) {
    changes.push({ type: 'add', value: b[j++] })
  }

  const hunks: DiffHunk[] = []
  const contextRadius = 3

  let current: DiffHunk | null = null
  let aLine = 1
  let bLine = 1
  for (const change of changes) {
    if (change.type === 'context') {
      if (current) {
        current.lines.push(change)
        current.trailingContext++
        aLine++
        bLine++
        if (current.trailingContext > contextRadius) {
          hunks.push(current)
          current = null
        }
      } else {
        aLine++
        bLine++
      }
    } else {
      if (!current) {
        current = {
          aStart: aLine,
          bStart: bLine,
          lines: [],
          leadingContext: 0,
          trailingContext: 0
        }
        const backfill = Math.min(contextRadius, hunks.length === 0 ? aLine - 1 : contextRadius)
        const startIndex = Math.max(0, hunks.reduce((acc, h) => acc + h.lines.length, 0))
        // no backfill of actual lines to keep logic simple for now
      }
      current.lines.push(change)
      if (change.type === 'remove') aLine++
      if (change.type === 'add') bLine++
      current.trailingContext = 0
    }
  }
  if (current) {
    hunks.push(current)
  }

  return { hunks, changes }
}

export function summarizeDiff(result: DiffResult): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const c of result.changes) {
    if (c.type === 'add') added++
    if (c.type === 'remove') removed++
  }
  return { added, removed }
}


