import {describe, expect, it} from 'vitest'
import {
  formatJsonWithNestedStrings,
  minifyJsonWithNestedStrings,
  unescapeJsonText
} from './jsonFormatter'

describe('jsonFormatter', () => {
  it('expands nested JSON strings', () => {
    const result = formatJsonWithNestedStrings('{"payload":"{\\"ok\\":true}"}')

    expect(result.expandedStringCount).toBe(1)
    expect(result.text).toContain('"ok": true')
  })

  it('minifies expanded JSON', () => {
    expect(minifyJsonWithNestedStrings('{"items":"[1,2]"}').text).toBe('{"items":[1,2]}')
  })

  it('unescapes JSON text', () => {
    expect(unescapeJsonText('"{\\"name\\":\\"tool-hub\\"}"')).toBe('{"name":"tool-hub"}')
  })
})
