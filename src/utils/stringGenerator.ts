export const CHARACTER_SETS = {
  numbers: '0123456789',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  special: '!@#$%^&*-_=+'
} as const

const AMBIGUOUS_CHARACTERS = new Set('0O1lI|`\'"')
const MAX_RANDOM_LENGTH = 4096
const MAX_GENERATION_COUNT = 1000
const MAX_TEMPLATE_TOKEN_LENGTH = 4096

export interface RandomStringOptions {
  length: number
  count: number
  includeNumbers: boolean
  includeLowercase: boolean
  includeUppercase: boolean
  includeSpecial: boolean
  customCharacters?: string
  excludeAmbiguous?: boolean
  requireEachSelected?: boolean
  preventConsecutiveDuplicates?: boolean
  prefix?: string
  suffix?: string
  separator?: string
  groupSize?: number
}

export interface TemplateGenerationOptions {
  template: string
  count: number
  customCharacters?: string
  now?: () => Date
}

function assertIntegerInRange(value: number, field: string, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field}必须是 ${min} 到 ${max} 之间的整数`)
  }
}

function uniqueCharacters(value: string): string {
  return [...new Set(Array.from(value))].join('')
}

function removeAmbiguousCharacters(value: string): string {
  return Array.from(value)
    .filter(character => !AMBIGUOUS_CHARACTERS.has(character))
    .join('')
}

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) {
    throw new Error('随机范围无效')
  }

  const range = 0x100000000
  const limit = range - (range % maxExclusive)
  const buffer = new Uint32Array(1)
  let value = 0

  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)

  return value % maxExclusive
}

function randomCharacter(characters: string): string {
  if (!characters) {
    throw new Error('字符集不能为空')
  }
  return Array.from(characters)[secureRandomInt(Array.from(characters).length)]
}

function shuffle<T>(values: T[]): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const swapIndex = secureRandomInt(index + 1)
    ;[values[index], values[swapIndex]] = [values[swapIndex], values[index]]
  }
  return values
}

function hasConsecutiveDuplicates(value: string): boolean {
  const characters = Array.from(value)
  return characters.some((character, index) => index > 0 && character === characters[index - 1])
}

function applyGrouping(value: string, groupSize: number, separator: string): string {
  if (!separator || groupSize <= 0) {
    return value
  }

  const characters = Array.from(value)
  const groups: string[] = []
  for (let index = 0; index < characters.length; index += groupSize) {
    groups.push(characters.slice(index, index + groupSize).join(''))
  }
  return groups.join(separator)
}

function buildCharacterSets(options: RandomStringOptions): string[] {
  const selectedSets = [
    options.includeNumbers ? CHARACTER_SETS.numbers : '',
    options.includeLowercase ? CHARACTER_SETS.lowercase : '',
    options.includeUppercase ? CHARACTER_SETS.uppercase : '',
    options.includeSpecial ? CHARACTER_SETS.special : '',
    options.customCharacters ?? ''
  ].filter(Boolean)

  const normalizedSets = selectedSets
    .map(uniqueCharacters)
    .map(characters => options.excludeAmbiguous
      ? removeAmbiguousCharacters(characters)
      : characters)
    .filter(Boolean)

  if (normalizedSets.length === 0) {
    throw new Error('请至少选择一个非空字符集')
  }

  return normalizedSets
}

function generateRandomCore(options: RandomStringOptions, characterSets: string[]): string {
  const allCharacters = uniqueCharacters(characterSets.join(''))
  if (options.preventConsecutiveDuplicates && Array.from(allCharacters).length < 2 && options.length > 1) {
    throw new Error('当前字符集无法避免连续重复')
  }

  if (options.requireEachSelected && characterSets.length > options.length) {
    throw new Error(`字符串长度不能小于必选字符集数量 ${characterSets.length}`)
  }

  const requiredCharacters = options.requireEachSelected
    ? characterSets.map(randomCharacter)
    : []

  for (let attempt = 0; attempt < 100; attempt++) {
    const characters = [...requiredCharacters]
    while (characters.length < options.length) {
      characters.push(randomCharacter(allCharacters))
    }
    const result = shuffle(characters).join('')

    if (!options.preventConsecutiveDuplicates || !hasConsecutiveDuplicates(result)) {
      return result
    }
  }

  throw new Error('无法在当前条件下生成不连续重复的字符串')
}

export function generateRandomStrings(options: RandomStringOptions): string[] {
  assertIntegerInRange(options.length, '字符串长度', 1, MAX_RANDOM_LENGTH)
  assertIntegerInRange(options.count, '生成数量', 1, MAX_GENERATION_COUNT)

  const groupSize = options.groupSize ?? 0
  assertIntegerInRange(groupSize, '分组长度', 0, MAX_RANDOM_LENGTH)

  const characterSets = buildCharacterSets(options)
  return Array.from({ length: options.count }, () => {
    const core = generateRandomCore(options, characterSets)
    const grouped = applyGrouping(core, groupSize, options.separator ?? '')
    return `${options.prefix ?? ''}${grouped}${options.suffix ?? ''}`
  })
}

function tokenLength(value: string | undefined, token: string): number {
  const length = value === undefined ? 1 : Number(value)
  assertIntegerInRange(length, `${token} 长度`, 1, MAX_TEMPLATE_TOKEN_LENGTH)
  return length
}

function randomFromSet(characters: string, length: number): string {
  return Array.from({ length }, () => randomCharacter(characters)).join('')
}

function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function formatDate(date: Date, pattern: string): string {
  const parts: Record<string, string> = {
    yyyy: String(date.getFullYear()).padStart(4, '0'),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    dd: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0')
  }

  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, token => parts[token])
}

function resolveTemplateToken(
  expression: string,
  sequence: number,
  customCharacters: string,
  now: Date
): string {
  const separatorIndex = expression.indexOf(':')
  const token = (separatorIndex === -1 ? expression : expression.slice(0, separatorIndex)).trim().toLowerCase()
  const argument = separatorIndex === -1 ? undefined : expression.slice(separatorIndex + 1).trim()

  switch (token) {
    case 'number':
      return randomFromSet(CHARACTER_SETS.numbers, tokenLength(argument, token))
    case 'lower':
      return randomFromSet(CHARACTER_SETS.lowercase, tokenLength(argument, token))
    case 'upper':
      return randomFromSet(CHARACTER_SETS.uppercase, tokenLength(argument, token))
    case 'alpha':
      return randomFromSet(
        CHARACTER_SETS.lowercase + CHARACTER_SETS.uppercase,
        tokenLength(argument, token)
      )
    case 'alphanumeric':
      return randomFromSet(
        CHARACTER_SETS.numbers + CHARACTER_SETS.lowercase + CHARACTER_SETS.uppercase,
        tokenLength(argument, token)
      )
    case 'hex':
      return randomFromSet('0123456789abcdef', tokenLength(argument, token))
    case 'custom':
      if (!customCharacters) {
        throw new Error('模板使用了 custom，请先填写自定义字符集')
      }
      return randomFromSet(uniqueCharacters(customCharacters), tokenLength(argument, token))
    case 'sequence': {
      const width = tokenLength(argument, token)
      return String(sequence).padStart(width, '0')
    }
    case 'uuid':
      if (argument !== undefined) {
        throw new Error('uuid 标记不支持参数')
      }
      return createUuid()
    case 'timestamp':
      if (argument !== undefined) {
        throw new Error('timestamp 标记不支持参数')
      }
      return String(now.getTime())
    case 'date':
      return formatDate(now, argument || 'yyyyMMdd')
    default:
      throw new Error(`不支持的模板标记：${expression}`)
  }
}

export function generateFromTemplate(options: TemplateGenerationOptions): string[] {
  assertIntegerInRange(options.count, '生成数量', 1, MAX_GENERATION_COUNT)
  if (!options.template.trim()) {
    throw new Error('请输入生成模板')
  }

  const now = (options.now ?? (() => new Date()))()
  return Array.from({ length: options.count }, (_, index) =>
    options.template.replace(/\{([^{}]+)\}/g, (_match, expression: string) =>
      resolveTemplateToken(expression, index + 1, options.customCharacters ?? '', now)
    )
  )
}
