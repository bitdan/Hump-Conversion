import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        title?: string;
        description?: string;
        icon?: string;
        requiresAuth?: boolean;
        hiddenInNav?: boolean;
    }
}

export const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/components/Home.vue'),
        meta: {
            title: 'Tool Hub - 在线开发者工具箱与小游戏集合',
            description: 'Tool Hub 提供在线驼峰转换、JSON 编辑器、文件 Diff、二维码生成、时间戳转换、MCP 测试台以及多种网页小游戏。'
        }
    },
    {
        path: '/auth',
        children: [
            {
                path: 'login',
                name: 'login',
                component: () => import('@/views/auth/LoginView.vue'),
                meta: {
                    requiresAuth: false,
                    title: '登录 - Tool Hub',
                    description: '登录 Tool Hub，使用在线开发工具和小游戏。'
                }
            },
            {
                path: 'register',
                name: 'register',
                component: () => import('@/views/auth/RegisterView.vue'),
                meta: {
                    requiresAuth: false,
                    title: '注册 - Tool Hub',
                    description: '注册 Tool Hub 账号，使用在线开发工具和小游戏。'
                }
            }
        ]
    },
    // {
    //     path: '/home',
    //     name: 'Home',
    //     component: () => import('@/components/Home.vue'),
    //     meta: { 
    //         title: '首页',
    //         icon: 'mdi-home',
    //         requiresAuth: false
    //     }
    // },
    {
        path: '/tools',
        name: 'Tools',
        meta: {
            title: '工具',
            icon: 'mdi-tools'
        },
        children: [
            {
                path: '/tools/skill-chat-workspace',
                name: 'SkillChatWorkspace',
                component: () => import('@/views/tools/SkillChatWorkspace.vue'),
                meta: {
                    title: 'AI 对话工作台',
                    icon: 'mdi-robot-outline',
                    description: 'Tool Hub AI 对话工作台，支持技能路由、多轮对话和结构化结果展示。'
                }
            },
            {
                path: '/tools/langgraph-viewer',
                redirect: '/tools/skill-chat-workspace'
            },
            {
                path: '/tools/mysql-analysis',
                name: 'MysqlAnalysis',
                component: () => import('@/views/tools/MysqlAnalysis.vue'),
                meta: {
                    title: 'MysqlAnalysis',
                    icon: 'mdi-link-variant',
                    description: '在线 MySQL 慢 SQL 与日志分析工具。'
                }
            },
            {
                path: '/tools/mcp-tester',
                name: 'McpTester',
                component: () => import('@/views/tools/McpTester.vue'),
                meta: {
                    title: 'MCP 测试台',
                    icon: 'mdi-connection',
                    description: '在线测试 MCP SSE 连接、工具列表与工具调用结果。'
                }
            },
            {
                path: '/tools/string-generator',
                name: 'StringGenerator',
                component: () => import('@/views/tools/StringGenerator.vue'),
                meta: {
                    title: '字符串生成',
                    icon: 'mdi-format-letter-case',
                    description: '在线字符串生成工具，快速生成随机文本与测试数据。'
                }
            },
            {
                path: '/tools/case-converter',
                name: 'CaseConverter',
                component: () => import('@/views/tools/CaseConverter.vue'),
                meta: {
                    title: '驼峰转换',
                    icon: 'mdi-format-letter-case',
                    description: '在线驼峰转换工具，支持驼峰、下划线、中划线、大小写格式互转。'
                }
            },

            {
                path: '/tools/base-converter',
                name: 'BaseConverter',
                component: () => import('@/views/tools/BaseConverter.vue'),
                meta: {
                    title: '进制转换',
                    icon: 'mdi-compare',
                    description: '在线进制转换工具，支持常见数字进制的快速换算。'
                }
            },
            {
                path: '/tools/file-diff',
                name: 'FileDiff',
                component: () => import('@/views/tools/FileDiff.vue'),
                meta: {
                    title: '文件对比 Diff',
                    icon: 'mdi-file-compare',
                    description: '在线文件 Diff 对比工具，快速比较文本与代码差异。'
                }
            },
            {
                path: '/tools/json-editor',
                name: 'JsonEditor',
                component: () => import('@/views/tools/JsonEditor.vue'),
                meta: {
                    title: 'JSON 编辑器',
                    icon: 'mdi-code-json',
                    description: '在线 JSON 编辑器，支持格式化、校验与结构化浏览。'
                }
            },
            {
                path: '/tools/calculator',
                name: 'Calculator',
                component: () => import('@/views/tools/Calculator.vue'),
                meta: {
                    title: '计算稿纸',
                    icon: 'mdi-calculator',
                    description: '在线计算稿纸工具，适合快速演算与中间过程记录。'
                }
            },
            {
                path: '/tools/timestamp',
                name: 'timestamp',
                component: () => import('@/views/tools/TimestampTool.vue'),
                meta: {
                    title: '时间戳工具',
                    icon: 'mdi-clock-outline',
                    description: '在线时间戳转换工具，支持时间与 Unix 时间戳互转。'
                }
            },
            {
                path: '/tools/data-encryption',
                name: 'DataEncryption',
                component: () => import('@/views/tools/DataEncryption.vue'),
                meta: {
                    title: '数据加密解密',
                    icon: 'mdi-shield-lock-outline',
                    description: '在线数据加密解密工具，便于常见文本加解密处理。'
                }
            },
            {
                path: '/tools/file-converter',
                name: 'FileConverter',
                component: () => import('@/views/tools/FileConverter.vue'),
                meta: {
                    title: '文件格式转换',
                    icon: 'mdi-file-sync',
                    description: '在线文件格式转换工具，简化常见文件处理流程。'
                }
            },
            {
                path: '/tools/json-to-entity',
                name: 'JsonToEntity',
                component: () => import('@/views/tools/JsonToEntity.vue'),
                meta: {
                    title: 'JSON转实体类',
                    icon: 'mdi-code-json',
                    description: '在线 JSON 转实体类工具，辅助快速生成代码模型。'
                }
            },
            {
                path: '/tools/qr-code-generator',
                name: 'QrCodeGenerator',
                component: () => import('@/views/tools/QrCodeGenerator.vue'),
                meta: {
                    title: '文字转二维码',
                    icon: 'mdi-qrcode',
                    description: '在线二维码生成工具，支持文本与链接即时转二维码。'
                }
            },
            {
                path: '/tools/two-factor-manager',
                name: 'TwoFactorManager',
                component: () => import('@/views/tools/TwoFactorManager.vue'),
                meta: {
                    title: '2FA 管理台',
                    icon: 'mdi-shield-key-outline',
                    description: '在线 2FA 管理台，支持 TOTP 扫码绑定、手动录入、导入导出与动态验证码查看。',
                    requiresAuth: true
                }
            },
            {
                path: '/tools/profile-center',
                name: 'ProfileCenter',
                component: () => import('@/views/tools/ProfileCenter.vue'),
                meta: {
                    title: '个人中心',
                    icon: 'mdi-account-cog-outline',
                    description: '查看和编辑当前账号的个人信息，支持修改密码。',
                    requiresAuth: true,
                    hiddenInNav: true
                }
            },
            {
                path: '/tools/jetbrain-checker',
                name: 'JetbrainChecker',
                component: () => import('@/views/tools/JetbrainChecker.vue'),
                meta: {
                    title: 'Jetbrain 激活',
                    icon: 'mdi-link-variant',
                    description: 'JetBrains 相关校验与辅助工具页面。'
                }
            },
            {
                path: '/tools/markdown-resume-pdf',
                name: 'MarkdownResumePdf',
                component: () => import('@/views/tools/MarkdownResumePdf.vue'),
                meta: {
                    title: '简历转PDF',
                    icon: 'mdi-file-pdf-box',
                    description: '在线将 Markdown 简历转换为 PDF，适合快速导出简历。'
                }
            },
            {
                path: '/tools/huawei-health-viewer',
                name: 'HuaweiHealthViewer',
                component: () => import('@/views/tools/HuaweiHealthViewer.vue'),
                meta: {
                    title: '华为健康数据浏览',
                    icon: 'mdi-heart-pulse',
                    description: '读取华为健康导出目录中的全部 JSON 数据，按类型查看统计、结构与原始记录。'
                }
            }
        ]
    },
    {
        path: '/games',
        name: 'Games',
        meta: {
            title: '游戏',
            icon: 'mdi-gamepad-variant'
        },
        children: [
            {
                path: '/games/dice-roller',
                name: 'DiceRoller',
                component: () => import('@/views/games/DiceRoller.vue'),
                meta: {
                    title: '投色子',
                    icon: 'mdi-dice-6'
                }
            },
            {
                path: '/games/sudoku',
                name: 'Sudoku',
                component: () => import('@/views/games/Sudoku.vue'),
                meta: {
                    title: '数独',
                    icon: 'mdi-grid-large'
                }
            },
            {
                path: '/games/tic-tac-toe',
                name: 'TicTacToe',
                component: () => import('@/views/games/TicTacToe.vue'),
                meta: {
                    title: '井字棋',
                    icon: 'mdi-grid'
                }
            },
            {
                path: '/games/puzzle',
                name: 'PuzzleGame',
                component: () => import('@/views/games/PuzzleGame.vue'),
                meta: {
                    title: '拼图游戏',
                    icon: 'mdi-puzzle'
                }
            },
            {
                path: '/games/gomoku',
                name: 'Gomoku',
                component: () => import('@/views/games/Gomoku.vue'),
                meta: {
                    title: '五子棋',
                    icon: 'mdi-chess-queen'
                }
            },
            {
                path: '/games/go',
                name: 'Go',
                component: () => import('@/views/games/Go.vue'),
                meta: {
                    title: '围棋',
                    icon: 'mdi-circle-outline'
                }
            },
            {
                path: '/games/chinese-chess',
                name: 'ChineseChess',
                component: () => import('@/views/games/ChineseChess.vue'),
                meta: {
                    title: '中国象棋',
                    icon: 'mdi-chess-king'
                }
            },
            {
                path: '/games/blind-chinese-chess',
                name: 'BlindChineseChess',
                component: () => import('@/views/games/BlindChineseChess.vue'),
                meta: {
                    title: '揭棋',
                    icon: 'mdi-chess-queen'
                }
            },
            {
                path: '/games/snake',
                name: 'Snake',
                component: () => import('@/views/games/Snake.vue'),
                meta: {
                    title: '贪吃蛇',
                    icon: 'mdi-snake'
                }
            },
            {
                path: '/games/tetris',
                name: 'Tetris',
                component: () => import('@/views/games/Tetris.vue'),
                meta: {
                    title: '俄罗斯方块',
                    icon: 'mdi-view-grid'
                }
            },
            {
                path: '/games/2048',
                name: 'Game2048',
                component: () => import('@/views/games/Game2048.vue'),
                meta: {
                    title: '2048',
                    icon: 'mdi-numeric-2-box'
                }
            },
            {
                path: '/games/pacman',
                name: 'Pacman',
                component: () => import('@/views/games/Pacman.vue'),
                meta: {
                    title: '吃豆人',
                    icon: 'mdi-pac-man'
                }
            },
            {
                path: '/games/link-game',
                name: 'LinkGame',
                component: () => import('@/views/games/LinkGame.vue'),
                meta: {
                    title: '连连看',
                    icon: 'mdi-puzzle-outline'
                }
            },
            {
                path: '/games/minesweeper',
                name: 'Minesweeper',
                component: () => import('@/views/games/Minesweeper.vue'),
                meta: {
                    title: '扫雷',
                    icon: 'mdi-mine'
                }
            },
            {
                path: '/games/breakout',
                name: 'Breakout',
                component: () => import('@/views/games/Breakout.vue'),
                meta: {
                    title: '打砖块',
                    icon: 'mdi-wall'
                }
            },
            {
                path: '/games/bubble-shooter',
                name: 'BubbleShooter',
                component: () => import('@/views/games/BubbleShooter.vue'),
                meta: {
                    title: '泡泡龙',
                    icon: 'mdi-circle-multiple'
                }
            },
            {
                path: '/games/zuma',
                name: 'Zuma',
                component: () => import('@/views/games/Zuma.vue'),
                meta: {
                    title: '祖玛',
                    icon: 'mdi-dots-circle'
                }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.beforeEach((to) => {
    if (to.meta?.requiresAuth && !localStorage.getItem('token')) {
        return {
            path: '/auth/login',
            query: {redirect: to.fullPath}
        }
    }
    return true
})

const DEFAULT_TITLE = 'Tool Hub - 在线开发者工具箱与小游戏集合'
const DEFAULT_DESCRIPTION = 'Tool Hub 提供在线开发者工具、文本处理工具、文件对比工具、二维码生成以及多种网页小游戏。'

function updateMetaTag(name: string, content: string) {
    let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
    if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', name)
        document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
}

function updatePropertyMetaTag(property: string, content: string) {
    let tag = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
    if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('property', property)
        document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
}

router.afterEach((to) => {
    const title = typeof to.meta?.title === 'string' ? `${to.meta.title}` : DEFAULT_TITLE
    const description = typeof to.meta?.description === 'string' ? `${to.meta.description}` : DEFAULT_DESCRIPTION

    document.title = title.includes('Tool Hub') ? title : `${title} - Tool Hub`
    updateMetaTag('description', description)
    updatePropertyMetaTag('og:title', document.title)
    updatePropertyMetaTag('og:description', description)

    const canonicalHref = `https://tool.linger.host${to.fullPath === '/' ? '/' : to.fullPath}`
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalHref)
})

export default router 
