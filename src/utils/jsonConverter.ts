interface JavaClassInfo {
  className: string
  fields: string[]
  imports: Set<string>
  innerClasses: string[]
}

export function convertJsonToJava(json: any, rootClassName: string): string {
  const classes: JavaClassInfo[] = []
  const processedClasses = new Set<string>()

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function generateClassName(key: string): string {
    return capitalizeFirst(key)
  }

  function getJavaType(value: any, key: string): { type: string; imports: string[] } {
    if (value === null) return { type: 'Object', imports: [] }
    
    if (Array.isArray(value)) {
      const itemType = value.length > 0 
        ? getJavaType(value[0], key.slice(0, -1) || key).type 
        : 'Object'
      return { 
        type: `List<${itemType}>`,
        imports: ['import java.util.List;']
      }
    }

    switch (typeof value) {
      case 'string':
        return { type: 'String', imports: [] }
      case 'number':
        return Number.isInteger(value) 
          ? { type: 'Long', imports: [] }
          : { type: 'Double', imports: [] }
      case 'boolean':
        return { type: 'Boolean', imports: [] }
      case 'object': {
        const className = generateClassName(key)
        if (!processedClasses.has(className)) {
          processedClasses.add(className)
          generateJavaClass(value, className)
        }
        return { type: className, imports: [] }
      }
      default:
        return { type: 'Object', imports: [] }
    }
  }

  function generateJavaClass(obj: any, className: string): void {
    const fields: string[] = []
    const imports = new Set<string>([
      'import lombok.Data;',
      'import lombok.NoArgsConstructor;',
      'import lombok.AllArgsConstructor;'
    ])
    const innerClasses: string[] = []

    // 添加类注解
    fields.push('@Data')
    fields.push('@NoArgsConstructor')
    fields.push('@AllArgsConstructor')
    fields.push(`public class ${className} {`)
    fields.push('')

    // 生成字段
    for (const [key, value] of Object.entries(obj)) {
      const { type, imports: fieldImports } = getJavaType(value, key)
      fieldImports.forEach(imp => imports.add(imp))
      fields.push(`    private ${type} ${key};`)
    }

    fields.push('}')

    classes.push({
      className,
      fields,
      imports,
      innerClasses
    })
  }

  // 开始转换
  generateJavaClass(json, rootClassName)

  // 生成最终的Java代码
  return classes.map(classInfo => {
    const importStatements = Array.from(classInfo.imports).sort().join('\n')
    
    return `${importStatements}

${classInfo.fields.join('\n')}
${classInfo.innerClasses.join('\n\n')}`
  }).join('\n\n')
} 