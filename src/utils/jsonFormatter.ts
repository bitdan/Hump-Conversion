export interface JsonTransformResult {
  value: unknown
  expandedStringCount: number
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
      const parsed = JSON.parse(value)
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
  return expandNestedJsonStrings(JSON.parse(text), maxDepth)
}

export function formatJsonWithNestedStrings(text: string): JsonTransformResult & { text: string } {
  const result = parseJsonWithNestedStrings(text)
  return {
    ...result,
    text: JSON.stringify(result.value, null, 2)
  }
}

export function minifyJsonWithNestedStrings(text: string): JsonTransformResult & { text: string } {
  const result = parseJsonWithNestedStrings(text)
  return {
    ...result,
    text: JSON.stringify(result.value)
  }
}

export function escapeJsonText(text: string): string {
  JSON.parse(text)
  return JSON.stringify(text)
}

export function unescapeJsonText(text: string): string {
  const trimmed = text.trim()
  let unescaped: unknown

  try {
    unescaped = JSON.parse(trimmed)
    if (typeof unescaped !== 'string') {
      throw new Error('当前内容不是转义后的 JSON 字符串')
    }
  } catch (error) {
    try {
      // 兼容旧版“添加转义”生成的无外层引号内容。
      unescaped = JSON.parse(`"${text}"`)
    } catch {
      throw error
    }
  }

  if (typeof unescaped !== 'string') {
    throw new Error('当前内容不是转义后的 JSON 字符串')
  }
  JSON.parse(unescaped)
  return unescaped
}
