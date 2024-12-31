import { parseString } from 'xml2js'
import { dump, load, loadAll } from 'js-yaml'

interface ConversionParams {
  content: string
  fromFormat: string
  toFormat: string
}

function parseXML(content: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parser = new parseString({
      explicitArray: false,  // 不要将单个元素转换为数组
      trim: true,           // 移除空白
      explicitRoot: false   // 不要包含根元素
    });
    
    try {
      parser(content, (err: Error | null, result: any) => {
        if (err) {
          reject(new Error('XML 格式无效'));
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      reject(new Error('XML 格式无效'));
    }
  });
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

function parseProperties(content: string): { properties: Record<string, string>, comments: string[] } {
  const properties: Record<string, string> = {}
  const comments: string[] = []
  const lines = content.split('\n')
  
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
        properties[key.trim()] = value.trim()
      }
    }
  }
  
  return { properties, comments }
}

function convertToProperties(data: any, comments: string[] = []): string {
  const lines: string[] = []
  
  // 添加注释和属性
  function flatten(obj: any, prefix = '', commentIndex = 0) {
    // 首先添加注释（如果有）
    if (comments.length > commentIndex) {
      lines.push(comments[commentIndex])
    }

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null) {
        flatten(value, newKey, commentIndex + 1)
      } else {
        lines.push(`${newKey}=${value}`)
      }
    }
  }
  
  flatten(data)
  
  // 添加剩余的注释
  for (let i = lines.length; i < comments.length; i++) {
    lines.push(comments[i])
  }
  
  return lines.join('\n')
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
      default:
        throw new Error('不支持的输入格式')
    }

    // Convert to output format
    switch (toFormat) {
      case 'xml':
        throw new Error('暂不支持转换为 XML 格式')
      case 'yaml':
        return dump(parsedData, {
          indent: 2,
          lineWidth: -1 // 禁用行宽限制
        })
      case 'properties':
        return convertToProperties(parsedData, comments)
      default:
        throw new Error('不支持的输出格式')
    }
  } catch (error) {
    throw error instanceof Error 
      ? error 
      : new Error('转换失败')
  }
} 