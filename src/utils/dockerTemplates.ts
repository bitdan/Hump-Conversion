export interface DockerServiceTemplateFieldOption {
    label: string
    value: string | number | boolean
}

export interface DockerServiceTemplateField {
    key: string
    label: string
    type: 'text' | 'number' | 'boolean' | 'select'
    placeholder?: string
    required?: boolean
    options?: DockerServiceTemplateFieldOption[]
    default?: string | number | boolean
}

export interface DockerServiceTemplate {
    id: string
    name: string
    description?: string
    icon?: string
    category: 'stateful' | 'stateless' | 'edge' | 'messaging' | 'observability'
    imagePlaceholder?: string
    fields: DockerServiceTemplateField[]
    toCompose: (params: Record<string, unknown>) => Record<string, unknown>
}

function asBool(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value === 'true' || value === '1'
    if (typeof value === 'number') return value !== 0
    return fallback
}

export const dockerServiceTemplates: DockerServiceTemplate[] = [
    {
        id: 'generic-service',
        name: '通用服务',
        icon: 'mdi-cube-outline',
        category: 'stateless',
        description: '任意镜像 + 端口/环境变量/卷的基础服务',
        imagePlaceholder: 'nginx:1.27-alpine',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'my-service', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'nginx:alpine', required: true },
            { key: 'ports', label: '端口映射(逗号分隔 host:container)', type: 'text', placeholder: '8080:80, 8443:443' },
            { key: 'env', label: '环境变量(逗号分隔 KEY=VALUE)', type: 'text', placeholder: 'TZ=Asia/Shanghai, NODE_ENV=production' },
            { key: 'volumes', label: '卷映射(逗号分隔 host:container)', type: 'text', placeholder: '/host/data:/data' },
            { key: 'restart', label: '重启策略', type: 'select', options: [
                { label: 'no', value: 'no' },
                { label: 'always', value: 'always' },
                { label: 'on-failure', value: 'on-failure' },
                { label: 'unless-stopped', value: 'unless-stopped' }
            ], default: 'unless-stopped' },
            { key: 'privileged', label: '特权模式', type: 'boolean', default: false }
        ],
        toCompose: (params) => {
            const serviceName = String(params.containerName || 'app')
            const image = String(params.image || '')
            const ports = String(params.ports || '')
                .split(',')
                .map(p => p.trim())
                .filter(Boolean)
            const env = String(params.env || '')
                .split(',')
                .map(e => e.trim())
                .filter(Boolean)
            const volumes = String(params.volumes || '')
                .split(',')
                .map(v => v.trim())
                .filter(Boolean)

            const service: Record<string, unknown> = {
                image,
                container_name: serviceName,
                restart: (params.restart as string) || 'unless-stopped'
            }
            if (ports.length) service.ports = ports
            if (env.length) service.environment = env
            if (volumes.length) service.volumes = volumes
            if (asBool(params.privileged)) service.privileged = true

            return service
        }
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        icon: 'mdi-database',
        category: 'stateful',
        description: '官方 PostgreSQL 数据库服务',
        imagePlaceholder: 'postgres:16-alpine',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'postgres', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'postgres:16-alpine', required: true },
            { key: 'password', label: '超级用户密码', type: 'text', placeholder: 'strong_password', required: true },
            { key: 'db', label: '默认数据库', type: 'text', placeholder: 'app_db' },
            { key: 'user', label: '用户', type: 'text', placeholder: 'app_user' },
            { key: 'port', label: '对外端口', type: 'number', placeholder: '5432' },
            { key: 'dataDir', label: '数据卷 (宿主路径)', type: 'text', placeholder: '/data/postgres' },
            { key: 'tz', label: '时区', type: 'text', placeholder: 'Asia/Shanghai', default: 'Asia/Shanghai' }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'postgres')
            const image = String(params.image || 'postgres:16-alpine')
            const port = params.port ? Number(params.port) : 5432
            const dataDir = String(params.dataDir || '')
            const environment = [
                `POSTGRES_PASSWORD=${params.password || ''}`,
                params.db ? `POSTGRES_DB=${params.db}` : '',
                params.user ? `POSTGRES_USER=${params.user}` : '',
                `TZ=${params.tz || 'Asia/Shanghai'}`
            ].filter(Boolean)

            const service: Record<string, unknown> = {
                image,
                container_name: name,
                restart: 'unless-stopped',
                environment,
                ports: [`${port}:5432`]
            }
            if (dataDir) {
                service.volumes = [`${dataDir}:/var/lib/postgresql/data`]
            }
            return service
        }
    },
    {
        id: 'redis',
        name: 'Redis',
        icon: 'mdi-database-outline',
        category: 'stateful',
        description: '官方 Redis 缓存服务',
        imagePlaceholder: 'redis:7-alpine',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'redis', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'redis:7-alpine', required: true },
            { key: 'port', label: '对外端口', type: 'number', placeholder: '6379' },
            { key: 'dataDir', label: '数据卷 (宿主路径)', type: 'text', placeholder: '/data/redis' },
            { key: 'appendOnly', label: 'AOF 持久化', type: 'boolean', default: true }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'redis')
            const image = String(params.image || 'redis:7-alpine')
            const port = params.port ? Number(params.port) : 6379
            const dataDir = String(params.dataDir || '')
            const appendOnly = asBool(params.appendOnly, true)

            const command = appendOnly ? [
                'redis-server', '--appendonly', 'yes'
            ] : undefined

            const service: Record<string, unknown> = {
                image,
                container_name: name,
                restart: 'unless-stopped',
                ports: [`${port}:6379`],
                command
            }
            if (dataDir) service.volumes = [`${dataDir}:/data`]
            return service
        }
    }
]

// Extra templates
dockerServiceTemplates.push(
    {
        id: 'nginx',
        name: 'Nginx',
        icon: 'mdi-nginx',
        category: 'edge',
        description: 'Nginx 反向代理/静态服务',
        imagePlaceholder: 'nginx:1.27-alpine',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'nginx', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'nginx:alpine', required: true },
            { key: 'http', label: 'HTTP 端口', type: 'number', placeholder: '80', default: 80 },
            { key: 'https', label: 'HTTPS 端口', type: 'number', placeholder: '443', default: 443 },
            { key: 'conf', label: '配置目录 (宿主路径)', type: 'text', placeholder: '/etc/nginx' },
            { key: 'html', label: '站点目录 (宿主路径)', type: 'text', placeholder: '/var/www/html' },
            { key: 'logs', label: '日志目录 (宿主路径)', type: 'text', placeholder: '/var/log/nginx' }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'nginx')
            const image = String(params.image || 'nginx:alpine')
            const http = params.http ? Number(params.http) : 80
            const https = params.https ? Number(params.https) : 443
            const vols: string[] = []
            if (params.conf) vols.push(`${params.conf}:/etc/nginx`)
            if (params.html) vols.push(`${params.html}:/usr/share/nginx/html`)
            if (params.logs) vols.push(`${params.logs}:/var/log/nginx`)
            const service: Record<string, unknown> = {
                image,
                container_name: name,
                restart: 'unless-stopped',
                ports: [`${http}:80`, `${https}:443`]
            }
            if (vols.length) service.volumes = vols
            return service
        }
    },
    {
        id: 'mysql',
        name: 'MySQL',
        icon: 'mdi-database',
        category: 'stateful',
        description: '官方 MySQL 数据库服务',
        imagePlaceholder: 'mysql:8.4',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'mysql', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'mysql:8.4', required: true },
            { key: 'rootPassword', label: 'root 密码', type: 'text', placeholder: 'strong_password', required: true },
            { key: 'database', label: '数据库名', type: 'text', placeholder: 'app_db' },
            { key: 'user', label: '用户', type: 'text', placeholder: 'app_user' },
            { key: 'password', label: '用户密码', type: 'text', placeholder: 'user_password' },
            { key: 'port', label: '对外端口', type: 'number', placeholder: '3306' },
            { key: 'dataDir', label: '数据卷 (宿主路径)', type: 'text', placeholder: '/data/mysql' },
            { key: 'tz', label: '时区', type: 'text', placeholder: 'Asia/Shanghai', default: 'Asia/Shanghai' }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'mysql')
            const image = String(params.image || 'mysql:8.4')
            const port = params.port ? Number(params.port) : 3306
            const dataDir = String(params.dataDir || '')
            const environment = [
                `MYSQL_ROOT_PASSWORD=${params.rootPassword || ''}`,
                params.database ? `MYSQL_DATABASE=${params.database}` : '',
                params.user ? `MYSQL_USER=${params.user}` : '',
                params.password ? `MYSQL_PASSWORD=${params.password}` : '',
                `TZ=${params.tz || 'Asia/Shanghai'}`
            ].filter(Boolean)
            const service: Record<string, unknown> = {
                image,
                container_name: name,
                restart: 'unless-stopped',
                environment,
                ports: [`${port}:3306`]
            }
            if (dataDir) service.volumes = [`${dataDir}:/var/lib/mysql`]
            return service
        }
    },
    {
        id: 'java-app',
        name: 'Java 应用 (JAR)',
        icon: 'mdi-language-java',
        category: 'stateless',
        description: '基于 OpenJDK 的 JAR 应用容器',
        imagePlaceholder: 'eclipse-temurin:21-jre-alpine',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'java-app', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'eclipse-temurin:21-jre-alpine', required: true },
            { key: 'jarPath', label: 'JAR 宿主路径', type: 'text', placeholder: '/opt/app/app.jar', required: true },
            { key: 'appPort', label: '对外端口', type: 'number', placeholder: '8080' },
            { key: 'javaOpts', label: 'JAVA_OPTS', type: 'text', placeholder: '-Xms256m -Xmx512m' },
            { key: 'env', label: '环境变量(逗号 KEY=VALUE)', type: 'text', placeholder: 'SPRING_PROFILES_ACTIVE=prod' }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'java-app')
            const image = String(params.image || 'eclipse-temurin:21-jre-alpine')
            const appPort = params.appPort ? Number(params.appPort) : undefined
            const env = String(params.env || '')
                .split(',')
                .map(e => e.trim())
                .filter(Boolean)
            const volumes = [`${params.jarPath || ''}:/app/app.jar`].filter(Boolean)
            const command = ['java'] as string[]
            if (params.javaOpts) command.push(...String(params.javaOpts).split(' ').filter(Boolean))
            command.push('-jar', '/app/app.jar')
            const service: Record<string, unknown> = {
                image,
                container_name: name,
                restart: 'unless-stopped',
                volumes,
                command
            }
            if (appPort) service.ports = [`${appPort}:${appPort}`]
            if (env.length) service.environment = env
            return service
        }
    },
    {
        id: 'rabbitmq',
        name: 'RabbitMQ',
        icon: 'mdi-rabbit',
        category: 'messaging',
        description: 'RabbitMQ 消息队列（含管理端口）',
        imagePlaceholder: 'rabbitmq:3-management',
        fields: [
            { key: 'containerName', label: '容器名称', type: 'text', placeholder: 'rabbitmq', required: true },
            { key: 'image', label: '镜像', type: 'text', placeholder: 'rabbitmq:3-management', required: true },
            { key: 'port', label: 'AMQP 端口', type: 'number', placeholder: '5672' },
            { key: 'mgmtPort', label: '管理端口', type: 'number', placeholder: '15672' },
            { key: 'dataDir', label: '数据卷 (宿主路径)', type: 'text', placeholder: '/data/rabbitmq' }
        ],
        toCompose: (params) => {
            const name = String(params.containerName || 'rabbitmq')
            const image = String(params.image || 'rabbitmq:3-management')
            const port = params.port ? Number(params.port) : 5672
            const mgmt = params.mgmtPort ? Number(params.mgmtPort) : 15672
            const volumes = params.dataDir ? [`${params.dataDir}:/var/lib/rabbitmq`] : undefined
            return {
                image,
                container_name: name,
                restart: 'unless-stopped',
                ports: [`${port}:5672`, `${mgmt}:15672`],
                volumes
            }
        }
    }
)

export interface ComposeProjectMeta {
    name: string
    version: '3' | '3.8'
}

export interface ComposeSpec {
    services: Record<string, Record<string, unknown>>
    networks?: Record<string, Record<string, unknown>>
    volumes?: Record<string, Record<string, unknown>>
}

export interface ComposeProject {
    meta: ComposeProjectMeta
    spec: ComposeSpec
}


