import { webcrypto } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  CHARACTER_SETS,
  generateFromTemplate,
  generateRandomStrings
} from './stringGenerator'

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true
})

describe('stringGenerator', () => {
  it('generates secure random strings with all selected character sets', () => {
    const [result] = generateRandomStrings({
      length: 12,
      count: 1,
      includeNumbers: true,
      includeLowercase: true,
      includeUppercase: true,
      includeSpecial: true,
      requireEachSelected: true
    })

    expect(result).toHaveLength(12)
    expect(result).toMatch(/[0-9]/)
    expect(result).toMatch(/[a-z]/)
    expect(result).toMatch(/[A-Z]/)
    expect(Array.from(result).some(character => CHARACTER_SETS.special.includes(character))).toBe(true)
  })

  it('supports prefixes, suffixes, grouping and ambiguous character exclusion', () => {
    const [result] = generateRandomStrings({
      length: 8,
      count: 1,
      includeNumbers: false,
      includeLowercase: false,
      includeUppercase: false,
      includeSpecial: false,
      customCharacters: 'AB01',
      excludeAmbiguous: true,
      prefix: 'KEY-',
      suffix: '-END',
      separator: ':',
      groupSize: 4
    })

    expect(result).toMatch(/^KEY-[AB]{4}:[AB]{4}-END$/)
  })

  it('generates values from template tokens', () => {
    const results = generateFromTemplate({
      template: 'ORD-{date:yyyyMMdd}-{upper:3}-{number:4}-{sequence:3}',
      count: 2,
      now: () => new Date(2026, 6, 28, 12, 30, 45)
    })

    expect(results[0]).toMatch(/^ORD-20260728-[A-Z]{3}-\d{4}-001$/)
    expect(results[1]).toMatch(/^ORD-20260728-[A-Z]{3}-\d{4}-002$/)
  })

  it('generates UUID and custom template tokens', () => {
    const [result] = generateFromTemplate({
      template: '{uuid}-{custom:4}',
      customCharacters: 'XYZ',
      count: 1
    })

    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[XYZ]{4}$/
    )
  })

  it('rejects impossible random requirements and unknown template tokens', () => {
    expect(() => generateRandomStrings({
      length: 2,
      count: 1,
      includeNumbers: true,
      includeLowercase: true,
      includeUppercase: true,
      includeSpecial: false,
      requireEachSelected: true
    })).toThrow('字符串长度不能小于必选字符集数量')

    expect(() => generateFromTemplate({
      template: '{unknown:4}',
      count: 1
    })).toThrow('不支持的模板标记')
  })
})
