import yaml from 'js-yaml'
import { parseStringPromise, Builder } from 'xml2js'

export interface FormatOptions {
  indent?: number
  newline?: string
}

export interface DetectResult {
  kind: 'json' | 'yaml' | 'xml' | 'csv' | 'text'
}

function getNewline(text: string): string {
  if (text.includes('\r\n')) return '\r\n'
  if (text.includes('\r')) return '\r'
  return '\n'
}

export function detectFormat(text: string): DetectResult {
  const sample = text.trim()
  if (!sample) return { kind: 'text' }
  if ((sample.startsWith('{') && sample.endsWith('}')) || (sample.startsWith('[') && sample.endsWith(']'))) {
    try { JSON.parse(sample); return { kind: 'json' } } catch {}
  }
  if (sample.startsWith('<') && sample.endsWith('>')) {
    return { kind: 'xml' }
  }
  if (sample.includes(': ') && !sample.includes(',')) {
    try { yaml.load(sample); return { kind: 'yaml' } } catch {}
  }
  if (sample.includes(',') || sample.includes('\t')) {
    const lines = sample.split(/\r?\n/)
    const delim = sample.includes('\t') ? '\t' : ','
    const consistent = lines.every(l => l.split(delim).length >= 2)
    if (consistent) return { kind: 'csv' }
  }
  return { kind: 'text' }
}

export async function formatContent(text: string, hint?: DetectResult, options?: FormatOptions): Promise<string> {
  const detected = hint?.kind ?? detectFormat(text).kind
  const indent = options?.indent ?? 2
  const newline = options?.newline ?? getNewline(text)

  if (detected === 'json') {
    try { return JSON.stringify(JSON.parse(text), null, indent) } catch { return text }
  }
  if (detected === 'yaml') {
    try {
      const obj = yaml.load(text)
      return yaml.dump(obj, { indent, lineWidth: 120 })
    } catch { return text }
  }
  if (detected === 'xml') {
    try {
      const obj = await parseStringPromise(text)
      const builder = new Builder({ renderOpts: { pretty: true, indent: ' '.repeat(indent), newline } })
      return builder.buildObject(obj)
    } catch { return text }
  }
  if (detected === 'csv') {
    const lines = text.split(/\r?\n/)
    if (lines.length <= 1) return text
    const delim = text.includes('\t') ? '\t' : ','
    const trimmed = lines.map(l => l.split(delim).map(s => s.trim()).join(delim))
    return trimmed.join(newline)
  }
  return text
}


