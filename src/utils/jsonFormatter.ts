import {
  isLosslessNumber,
  parse as parseLosslessJson,
  stringify as stringifyLosslessJson
} from 'lossless-json'

export interface JsonTransformResult {
  value: unknown
  expandedStringCount: number
}

function stringifyJson(value: unknown, space?: number): string {
  const text = stringifyLosslessJson(value, undefined, space)
  if (text === undefined) {
    throw new TypeError('无法序列化 JSON 数据')
  }
  return text
}

function looksLikeJsonContainer(value: string): boolean {
  const trimmed = value.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

function expandNestedJsonStrings(value: unknown, depth: number): JsonTransformResult {
  if (depth <= 0) {
    return { value, expandedStringCount: 0 }
  }

  if (typeof value === 'string' && looksLikeJsonContainer(value)) {
    try {
      const parsed = parseLosslessJson(value)
      const expanded = expandNestedJsonStrings(parsed, depth - 1)
      return {
        value: expanded.value,
        expandedStringCount: expanded.expandedStringCount + 1
      }
    } catch {
      return { value, expandedStringCount: 0 }
    }
  }

  if (Array.isArray(value)) {
    let expandedStringCount = 0
    const expanded = value.map(item => {
      const result = expandNestedJsonStrings(item, depth - 1)
      expandedStringCount += result.expandedStringCount
      return result.value
    })
    return { value: expanded, expandedStringCount }
  }

  if (isLosslessNumber(value)) {
    return { value, expandedStringCount: 0 }
  }

  if (value !== null && typeof value === 'object') {
    let expandedStringCount = 0
    const expanded = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const result = expandNestedJsonStrings(item, depth - 1)
        expandedStringCount += result.expandedStringCount
        return [key, result.value]
      })
    )
    return { value: expanded, expandedStringCount }
  }

  return { value, expandedStringCount: 0 }
}

export function parseJsonWithNestedStrings(text: string, maxDepth = 100): JsonTransformResult {
  return expandNestedJsonStrings(parseLosslessJson(text), maxDepth)
}

export function formatJsonWithNestedStrings(text: string): JsonTransformResult & { text: string } {
  const result = parseJsonWithNestedStrings(text)
  return {
    ...result,
    text: stringifyJson(result.value, 2)
  }
}

export function minifyJsonWithNestedStrings(text: string): JsonTransformResult & { text: string } {
  const result = parseJsonWithNestedStrings(text)
  return {
    ...result,
    text: stringifyJson(result.value)
  }
}

export function escapeJsonText(text: string): string {
  parseLosslessJson(text)
  return stringifyJson(text)
}

export function unescapeJsonText(text: string): string {
  const trimmed = text.trim()
  let unescaped: unknown

  try {
    unescaped = parseLosslessJson(trimmed)
    if (typeof unescaped !== 'string') {
      throw new Error('当前内容不是转义后的 JSON 字符串')
    }
  } catch (error) {
    try {
      // 兼容旧版“添加转义”生成的无外层引号内容。
      unescaped = parseLosslessJson(`"${text}"`)
    } catch {
      throw error
    }
  }

  if (typeof unescaped !== 'string') {
    throw new Error('当前内容不是转义后的 JSON 字符串')
  }
  parseLosslessJson(unescaped)
  return unescaped
}
