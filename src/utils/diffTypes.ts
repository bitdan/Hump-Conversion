export interface LineChange {
  type: 'add' | 'remove' | 'context'
  value: string
}

export interface DiffHunk {
  aStart: number
  bStart: number
  lines: LineChange[]
  leadingContext: number
  trailingContext: number
}

export interface DiffResult {
  hunks: DiffHunk[]
  changes: LineChange[]
}


