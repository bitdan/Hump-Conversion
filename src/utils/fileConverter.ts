import { Parser, Builder } from 'xml2js'
import { dump, load, loadAll } from 'js-yaml'

interface ConversionParams {
  content: string
  fromFormat: string
  toFormat: string
}

function parseXML(content: string): Promise<any> {
  const parser = new Parser({
    explicitArray: false,
    trim: true,
    explicitRoot: false
  })
  
  return parser.parseStringPromise(content)
    .catch(() => {
      throw new Error('XML 格式无效')
    })
}

function parseYAML(content: string): any {
  try {
    // 使用 loadAll 加载所有文档并合并
    const documents = Array.from(loadAll(content))
    
    // 如果只有一个文档，直接返回
    if (documents.length === 1) {
      return documents[0]
    }
    
    // 多个文档时，将它们合并成一个对象
    return documents.reduce((merged, doc) => {
      return { ...merged, ...doc }
    }, {})
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`YAML 格式无效: ${error.message}`)
    }
    throw new Error('YAML 格式无效')
  }
}

interface PropertyLine {
  type: 'comment' | 'property'
  content: string
  key?: string
  value?: string
}

function escapeYamlValue(value: string): string {
  // 如果值包含特殊字符，需要加引号
  if (value.includes(':') || value.includes('#') || value.includes('=')) {
    return `"${value.replace(/"/g, '\\"')}"`
  }
  return value
}

function parseProperties(content: string): { properties: Record<string, string>, comments: string[] } {
  const properties: Record<string, string> = {}
  const comments: string[] = []
  const lines = content.split('\n')
  
  function setNestedProperty(obj: any, path: string[], value: any) {
    let current = obj
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]
      if (!(key in current)) {
        current[key] = {}
      }
      current = current[key]
    }
    // 处理特殊字符
    if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
      value = escapeYamlValue(value)
    }
    current[path[path.length - 1]] = value
  }
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      comments.push('')  // 保留空行
    } else if (trimmed.startsWith('#')) {
      comments.push(trimmed)  // 保留注释
    } else {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value) {
        const keyPath = key.trim().split('.')
        const finalValue = value.trim()
        
        // 处理特殊值
        if (finalValue === 'true') {
          setNestedProperty(properties, keyPath, true)
        } else if (finalValue === 'false') {
          setNestedProperty(properties, keyPath, false)
        } else if (finalValue === 'null') {
          setNestedProperty(properties, keyPath, null)
        } else if (!isNaN(Number(finalValue))) {
          setNestedProperty(properties, keyPath, Number(finalValue))
        } else {
          setNestedProperty(properties, keyPath, finalValue)
        }
      }
    }
  }
  
  return { properties, comments }
}

function convertToProperties(data: any, comments: string[] = []): string {
  const lines: string[] = []
  
  function flattenObject(obj: any, prefix = '') {
    for (const key in obj) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key
      
      if (value !== null && typeof value === 'object') {
        flattenObject(value, newKey)
      } else {
        // 处理特殊字符
        let finalValue = value
        if (typeof value === 'string') {
          // 如果值是被 YAML 转义的字符串，去掉引号
          if (value.startsWith('"') && value.endsWith('"')) {
            finalValue = value.slice(1, -1).replace(/\\"/g, '"')
          }
        }
        lines.push(`${newKey}=${finalValue}`)
      }
    }
  }
  
  // 先添加所有属性
  flattenObject(data)
  
  // 对属性进行排序
  lines.sort()
  
  // 在适当的位置插入注释
  const result: string[] = []
  let commentIndex = 0
  
  for (const line of lines) {
    // 在每个主要部分之前添加注释
    while (commentIndex < comments.length && comments[commentIndex]) {
      result.push(comments[commentIndex])
      commentIndex++
    }
    result.push(line)
    commentIndex++
  }
  
  // 添加剩余的注释
  while (commentIndex < comments.length) {
    result.push(comments[commentIndex])
    commentIndex++
  }
  
  return result.join('\n')
}

function convertToXML(data: any): string {
  try {
    const builder = new Builder({
      renderOpts: { pretty: true, indent: '  ' },
      headless: false,  // 添加 XML 声明
      rootName: 'root'
    })
    
    // 确保数据有一个根节点
    const wrappedData = { root: data }
    return builder.buildObject(wrappedData)
  } catch (error) {
    throw new Error('转换为 XML 格式失败')
  }
}

function parseJSON(content: string): any {
  try {
    return JSON.parse(content)
  } catch (error) {
    throw new Error('JSON 格式无效')
  }
}

function convertToJSON(data: any): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    throw new Error('转换为 JSON 格式失败')
  }
}

// 在 detectFormat 函数中添加 JSON 检测
function detectFormat(content: string): string {
  content = content.trim()
  if (!content) return ''
  
  // 检测 JSON
  if ((content.startsWith('{') && content.endsWith('}')) || 
      (content.startsWith('[') && content.endsWith(']'))) {
    try {
      JSON.parse(content)
      return 'json'
    } catch {
      // 如果解析失败，继续检测其他格式
    }
  }
  
  // 检测 XML
  if (content.startsWith('<?xml') || (content.startsWith('<') && content.endsWith('>'))) {
    return 'xml'
  }
  
  // 检测 YAML
  if (content.includes('---') || content.includes(':')) {
    return 'yaml'
  }
  
  // 检测 Properties
  if (content.split('\n').some(line => line.includes('='))) {
    return 'properties'
  }
  
  return ''
}

export async function convertFile({ content, fromFormat, toFormat }: ConversionParams): Promise<string> {
  try {
    if (!content.trim()) {
      throw new Error('请输入需要转换的内容')
    }

    // Parse input
    let parsedData: any
    let comments: string[] = []
    
    switch (fromFormat) {
      case 'xml':
        parsedData = await parseXML(content)
        break
      case 'yaml':
        parsedData = parseYAML(content)
        break
      case 'properties':
        const result = parseProperties(content)
        parsedData = result.properties
        comments = result.comments
        break
      case 'json':
        parsedData = parseJSON(content)
        break
      default:
        throw new Error('不支持的输入格式')
    }

    // Convert to output format
    switch (toFormat) {
      case 'xml':
        return convertToXML(parsedData)
      case 'yaml':
        return dump(parsedData, {
          indent: 2,
          lineWidth: -1
        })
      case 'properties':
        return convertToProperties(parsedData, comments)
      case 'json':
        return convertToJSON(parsedData)
      default:
        throw new Error('不支持的输出格式')
    }
  } catch (error) {
    throw error instanceof Error 
      ? error 
      : new Error('转换失败')
  }
} 