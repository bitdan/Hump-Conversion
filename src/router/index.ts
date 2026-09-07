import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'
import {useUserStore} from '@/stores/user'
import {isTokenExpired} from '@/utils/authToken'

declare module 'vue-router' {
    interface RouteMeta {
        title?: string;
        description?: string;
        icon?: string;
        requiresAuth?: boolean;
        hiddenInNav?: boolean;
        keywords?: string[];
        featured?: boolean;
        groupOrder?: number;
        robots?: string;
    }
}

export const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/components/Home.vue'),
        meta: {
            title: 'Tool Hub - 在线开发者工具箱与小游戏集合',
            description: 'Tool Hub 提供在线驼峰转换、JSON 编辑器、文件 Diff、二维码生成、时间戳转换、MCP 测试台以及多种网页小游戏。',
            keywords: ['工具箱', '开发工具', '小游戏', 'AI 对话']
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
        redirect: '/tools/skill-chat-workspace',
        meta: {
            title: '工具',
            icon: 'mdi-tools',
            groupOrder: 1
        },
        children: [
            {
                path: '/tools/skill-chat-workspace',
                name: 'SkillChatWorkspace',
                component: () => import('@/views/tools/SkillChatWorkspace.vue'),
                meta: {
                    title: 'Agent 任务工作台',
                    icon: 'mdi-robot-outline',
                    description: '面向开发任务的 Agent 工作台，支持意图路由、架构设计、堆栈诊断、算法辅导、SQL 生成和结构化轨迹展示。',
                    keywords: ['AI', 'Agent', '工具调用', '堆栈', 'LeetCode', 'SQL'],
                    featured: true
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
                    title: '慢 SQL 分析',
                    icon: 'mdi-database-search-outline',
                    description: '在线 MySQL 慢 SQL 与日志分析工具。',
                    keywords: ['MySQL', '慢 SQL', '日志', '数据库'],
                    featured: true
                }
            },
            {
                path: '/tools/mcp-tester',
                name: 'McpTester',
                component: () => import('@/views/tools/McpTester.vue'),
                meta: {
                    title: 'MCP 测试台',
                    icon: 'mdi-connection',
                    description: '在线测试 MCP SSE 连接、工具列表与工具调用结果。',
                    keywords: ['MCP', 'SSE', '工具调用'],
                    featured: true
                }
            },
            {
                path: '/tools/string-generator',
                name: 'StringGenerator',
                component: () => import('@/views/tools/StringGenerator.vue'),
                meta: {
                    title: '字符串生成',
                    icon: 'mdi-format-letter-case',
                    description: '安全生成随机字符串、密码、订单号、UUID 与模板化测试数据。',
                    keywords: ['随机', '字符串', '密码', '模板', 'UUID', '订单号', '测试数据']
                }
            },
            {
                path: '/tools/case-converter',
                name: 'CaseConverter',
                component: () => import('@/views/tools/CaseConverter.vue'),
                meta: {
                    title: '驼峰转换',
                    icon: 'mdi-format-letter-case',
                    description: '在线驼峰转换工具，支持驼峰、下划线、中划线、大小写格式互转。',
                    keywords: ['驼峰', '下划线', '中划线', '大小写'],
                    featured: true
                }
            },
            //
            // {
            //     path: '/tools/base-converter',
            //     name: 'BaseConverter',
            //     component: () => import('@/views/tools/BaseConverter.vue'),
            //     meta: {
            //         title: '进制转换',
            //         icon: 'mdi-compare',
            //         description: '在线进制转换工具，支持常见数字进制的快速换算。'
            //     }
            // },
            {
                path: '/tools/file-diff',
                name: 'FileDiff',
                component: () => import('@/views/tools/FileDiff.vue'),
                meta: {
                    title: '文件对比 Diff',
                    icon: 'mdi-file-compare',
                    description: '在线文件 Diff 对比工具，快速比较文本与代码差异。',
                    keywords: ['Diff', '文件对比', '代码差异'],
                    featured: true
                }
            },
            {
                path: '/tools/epub-reader',
                name: 'EpubReader',
                component: () => import('@/views/tools/EpubReader.vue'),
                meta: {
                    title: 'EPUB 阅读器',
                    icon: 'mdi-book-open-page-variant-outline',
                    description: '在线 EPUB 阅读器，支持本地文件解析、目录导航、阅读主题和字号调节。',
                    keywords: ['EPUB', '阅读器', '电子书']
                }
            },
            {
                path: '/tools/json-editor',
                name: 'JsonEditor',
                component: () => import('@/views/tools/JsonEditor.vue'),
                meta: {
                    title: 'JSON 编辑器',
                    icon: 'mdi-code-json',
                    description: '在线 JSON 编辑器，支持递归格式化转义 JSON、校验与压缩。',
                    keywords: ['JSON', '格式化', '转义', '压缩'],
                    featured: true
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
                    description: '在线时间戳转换工具，支持时间与 Unix 时间戳互转。',
                    keywords: ['时间戳', 'Unix', '日期'],
                    featured: true
                }
            },
            {
                path: '/tools/cron-helper',
                name: 'CronHelper',
                component: () => import('@/views/tools/CronHelper.vue'),
                meta: {
                    title: 'Cron 表达式助手',
                    icon: 'mdi-calendar-clock',
                    description: '在线 Cron 表达式助手，支持生成 Cron、反解析字段含义和下次执行时间预览。',
                    keywords: ['Cron', '定时任务', '表达式'],
                    featured: true
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
            // {
            //     path: '/tools/file-converter',
            //     name: 'FileConverter',
            //     component: () => import('@/views/tools/FileConverter.vue'),
            //     meta: {
            //         title: '文件格式转换',
            //         icon: 'mdi-file-sync',
            //         description: '在线文件格式转换工具，简化常见文件处理流程。'
            //     }
            // },
            // {
            //     path: '/tools/json-to-entity',
            //     name: 'JsonToEntity',
            //     component: () => import('@/views/tools/JsonToEntity.vue'),
            //     meta: {
            //         title: 'JSON转实体类',
            //         icon: 'mdi-code-json',
            //         description: '在线 JSON 转实体类工具，辅助快速生成代码模型。'
            //     }
            // },
            {
                path: '/tools/qr-code-generator',
                name: 'QrCodeGenerator',
                component: () => import('@/views/tools/QrCodeGenerator.vue'),
                meta: {
                    title: '文字转二维码',
                    icon: 'mdi-qrcode',
                    description: '在线二维码生成工具，支持文本与链接即时转二维码。',
                    keywords: ['二维码', 'QR Code', '链接'],
                    featured: true
                }
            },
            {
                path: '/tools/code-shot-generator',
                name: 'CodeShotGenerator',
                component: () => import('@/views/tools/CodeShotGenerator.vue'),
                meta: {
                    title: '代码截图',
                    icon: 'mdi-camera-outline',
                    description: '在线代码截图生成器，支持主题、语言、背景和 PNG 导出。',
                    keywords: ['代码截图', 'PNG', '主题']
                }
            },
            {
                path: '/tools/pixi-lab',
                alias: ['/tools/gpu-shader-lab', '/games/particle-lab'],
                name: 'PixiLab',
                component: () => import('@/views/tools/PixiLab.vue'),
                meta: {
                    title: 'PixiJS',
                    icon: 'mdi-chart-bubble',
                    keywords: ['PixiJS', 'GPU', 'WebGL', '粒子', 'Shader', 'GLSL', '烟花', '水波', '极光'],
                    featured: true
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
                path: '/tools/admin-users',
                name: 'AdminUsers',
                component: () => import('@/views/tools/AdminUserManagement.vue'),
                meta: {
                    title: '用户管理',
                    icon: 'mdi-account-group-outline',
                    description: '管理员查看用户、调整状态和重置密码。',
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
            }
        ]
    },
    {
        path: '/market',
        name: 'Market',
        meta: {
            title: '市场',
            icon: 'mdi-finance',
            groupOrder: 2
        },
        children: [
            {
                path: '/market/review',
                name: 'MarketReview',
                component: () => import('@/views/market/MarketReview.vue'),
                meta: {
                    title: '涨停池复盘',
                    icon: 'mdi-chart-timeline-variant',
                    description: '涨停池、板块强度、2进3候选和分歧转一致识别。',
                    keywords: ['股票', '涨停池', '复盘', '板块强度'],
                    featured: true
                }
            }
        ]
    },
    {
        path: '/community',
        name: 'Community',
        meta: {
            title: '社区',
            icon: 'mdi-forum-outline',
            groupOrder: 3
        },
        children: [
            {
                path: '/community/posts',
                name: 'PostList',
                component: () => import('@/views/community/PostList.vue'),
                meta: {
                    title: '帖子',
                    icon: 'mdi-post-outline',
                    description: 'Tool Hub 社区帖子列表，发布和查看工具使用经验。',
                    keywords: ['社区', '帖子', '经验'],
                    featured: true
                }
            },
            {
                path: '/community/posts/new',
                name: 'PostCreate',
                component: () => import('@/views/community/PostEditor.vue'),
                meta: {
                    title: '发帖',
                    icon: 'mdi-pencil-plus',
                    requiresAuth: true,
                    hiddenInNav: true
                }
            },
            {
                path: '/community/posts/:id',
                name: 'PostDetail',
                component: () => import('@/views/community/PostDetail.vue'),
                meta: {
                    title: '帖子详情',
                    icon: 'mdi-post-outline',
                    hiddenInNav: true
                }
            },
            {
                path: '/community/posts/:id/edit',
                name: 'PostEdit',
                component: () => import('@/views/community/PostEditor.vue'),
                meta: {
                    title: '编辑帖子',
                    icon: 'mdi-pencil',
                    requiresAuth: true,
                    hiddenInNav: true
                }
            }
        ]
    },
    {
        path: '/games',
        name: 'Games',
        meta: {
            title: '游戏',
            icon: 'mdi-gamepad-variant',
            groupOrder: 4
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
                path: '/games/angry-birds',
                name: 'AngryBirds',
                component: () => import('@/views/games/AngryBirds.vue'),
                meta: {
                    title: '愤怒的小鸟',
                    icon: 'mdi-bird'
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
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFoundView.vue'),
        meta: {
            title: '页面不存在',
            description: '访问的页面不存在，请返回 Tool Hub 首页或通过导航选择工具。',
            hiddenInNav: true,
            robots: 'noindex,follow'
        }
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.beforeEach((to) => {
    if (to.meta?.requiresAuth) {
        const userStore = useUserStore()
        if (userStore.token && !isTokenExpired(userStore.token)) return true

        if (userStore.token) {
            userStore.clearUserInfo()
        }
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
    const robots = typeof to.meta?.robots === 'string'
        ? to.meta.robots
        : to.meta?.requiresAuth || to.path.startsWith('/auth/')
            ? 'noindex,nofollow'
            : 'index,follow'

    document.title = title.includes('Tool Hub') ? title : `${title} - Tool Hub`
    updateMetaTag('description', description)
    updateMetaTag('robots', robots)
    updatePropertyMetaTag('og:title', document.title)
    updatePropertyMetaTag('og:description', description)

    const canonicalPath = to.path === '/' ? '/' : to.path.replace(/\/+$/, '')
    const configuredSiteUrl = String(import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')
    const canonicalHref = `${configuredSiteUrl}${canonicalPath}`
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalHref)
})

export default router 
