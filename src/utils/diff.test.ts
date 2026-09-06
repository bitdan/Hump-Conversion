import {describe, expect, it} from 'vitest'
import {diffLines, summarizeDiff} from './diff'

describe('diffLines', () => {
  it('summarizes added and removed lines', () => {
    const result = diffLines('alpha\nbeta', 'alpha\ngamma')

    expect(summarizeDiff(result)).toEqual({added: 1, removed: 1})
  })
})
