import {createRouter, createWebHistory, type RouteRecordRaw} from 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        title?: string;
        icon?: string;
        requiresAuth?: boolean;
    }
}

export const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/case-converter'
    },
    {
        path: '/auth',
        children: [
            {
                path: 'login',
                name: 'login',
                component: () => import('@/views/auth/LoginView.vue'),
                meta: {requiresAuth: false}
            },
            {
                path: 'register',
                name: 'register',
                component: () => import('@/views/auth/RegisterView.vue'),
                meta: {requiresAuth: false}
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
                path: '/tools/langgraph-viewer',
                name: 'LangGraphViewer',
                component: () => import('@/views/tools/LangGraphViewer.vue'),
                meta: {
                    title: 'LangGraph ',
                    icon: 'mdi-brain'
                }
            },
            /*            {
                            path: '/tools/docker-compose-generator',
                            name: 'DockerComposeGenerator',
                            component: () => import('@/views/tools/DockerComposeGenerator.vue'),
                            meta: {
                                title: 'DockerFile',
                                icon: 'mdi-docker'
                            }
                        },*/
            {
                path: '/tools/mysql-analysis',
                name: 'MysqlAnalysis',
                component: () => import('@/views/tools/MysqlAnalysis.vue'),
                meta: {
                    title: 'MysqlAnalysis',
                    icon: 'mdi-link-variant'
                }
            },
            {
                path: '/tools/mcp-tester',
                name: 'McpTester',
                component: () => import('@/views/tools/McpTester.vue'),
                meta: {
                    title: 'MCP 测试台',
                    icon: 'mdi-connection'
                }
            },
            {
                path: '/tools/sql-to-er',
                name: 'SqlToErDiagram',
                component: () => import('@/views/tools/SqlToErDiagram.vue'),
                meta: {
                    title: 'SQL转ER图',
                    icon: 'mdi-database-eye'
                }
            },
            {
                path: '/tools/base-converter',
                name: 'BaseConverter',
                component: () => import('@/views/tools/BaseConverter.vue'),
                meta: {
                    title: '进制转换',
                    icon: 'mdi-compare'
                }
            },
            {
                path: '/tools/file-diff',
                name: 'FileDiff',
                component: () => import('@/views/tools/FileDiff.vue'),
                meta: {
                    title: '文件对比 Diff',
                    icon: 'mdi-file-compare'
                }
            },
            {
                path: '/tools/case-converter',
                name: 'CaseConverter',
                component: () => import('@/views/tools/CaseConverter.vue'),
                meta: {
                    title: '驼峰转换',
                    icon: 'mdi-format-letter-case'
                }
            },
            {
                path: '/tools/json-editor',
                name: 'JsonEditor',
                component: () => import('@/views/tools/JsonEditor.vue'),
                meta: {
                    title: 'JSON 编辑器',
                    icon: 'mdi-code-json'
                }
            },
            {
                path: '/tools/calculator',
                name: 'Calculator',
                component: () => import('@/views/tools/Calculator.vue'),
                meta: {
                    title: '计算稿纸',
                    icon: 'mdi-calculator'
                }
            },
            {
                path: '/tools/string-generator',
                name: 'StringGenerator',
                component: () => import('@/views/tools/StringGenerator.vue'),
                meta: {
                    title: '字符串生成',
                    icon: 'mdi-format-letter-case'
                }
            },
            {
                path: '/tools/timestamp',
                name: 'timestamp',
                component: () => import('@/views/tools/TimestampTool.vue'),
                meta: {
                    title: '时间戳工具',
                    icon: 'mdi-clock-outline'
                }
            },
            {
                path: '/tools/data-encryption',
                name: 'DataEncryption',
                component: () => import('@/views/tools/DataEncryption.vue'),
                meta: {
                    title: '数据加密解密',
                    icon: 'mdi-shield-lock-outline'
                }
            },
            {
                path: '/tools/file-converter',
                name: 'FileConverter',
                component: () => import('@/views/tools/FileConverter.vue'),
                meta: {
                    title: '文件格式转换',
                    icon: 'mdi-file-sync'
                }
            },
            {
                path: '/tools/json-to-entity',
                name: 'JsonToEntity',
                component: () => import('@/views/tools/JsonToEntity.vue'),
                meta: {
                    title: 'JSON转实体类',
                    icon: 'mdi-code-json'
                }
            },
            {
                path: '/tools/qr-code-generator',
                name: 'QrCodeGenerator',
                component: () => import('@/views/tools/QrCodeGenerator.vue'),
                meta: {
                    title: '文字转二维码',
                    icon: 'mdi-qrcode'
                }
            },
            {
                path: '/tools/jetbrain-checker',
                name: 'JetbrainChecker',
                component: () => import('@/views/tools/JetbrainChecker.vue'),
                meta: {
                    title: 'Jetbrain 激活',
                    icon: 'mdi-link-variant'
                }
            },
            /*            {
                            path: '/tools/stock-watchlist',
                            name: 'StockWatchlist',
                            component: () => import('@/views/tools/StockWatchlist.vue'),
                            meta: {
                                title: '股票自选',
                                icon: 'mdi-chart-line'
                            }
                        },*/
            {
                path: '/tools/markdown-resume-pdf',
                name: 'MarkdownResumePdf',
                component: () => import('@/views/tools/MarkdownResumePdf.vue'),
                meta: {
                    title: '简历转PDF',
                    icon: 'mdi-file-pdf-box'
                }
            },
            {
                path: '/tools/data-structure-trainer',
                name: 'DataStructureTrainer',
                component: () => import('@/views/tools/DataStructureTrainer.vue'),
                meta: {
                    title: '算法训练场',
                    icon: 'mdi-graph'
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

export default router 
