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

  it('preserves long integers and high-precision decimals', () => {
    const source = '{"id":9223372036854775807,"amount":0.123456789012345678901}'

    expect(minifyJsonWithNestedStrings(source).text).toBe(source)
  })

  it('preserves long integers in expanded nested JSON strings', () => {
    const source = '{"payload":"{\\"id\\":9223372036854775807}"}'

    expect(minifyJsonWithNestedStrings(source).text)
      .toBe('{"payload":{"id":9223372036854775807}}')
  })

  it('unescapes JSON text', () => {
    expect(unescapeJsonText('"{\\"name\\":\\"tool-hub\\"}"')).toBe('{"name":"tool-hub"}')
  })
})
