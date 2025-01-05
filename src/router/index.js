import { createRouter, createWebHistory } from 'vue-router'
import Auth from '@/layouts/auth/Auth.vue'

const routes = [
    {
        path: '/auth',
        component: Auth,
        children: [
            {
                path: 'login',
                name: 'Login',
                component: () => import('@/views/auth/Login.vue'),
                meta: {
                    layout: 'auth',
                    requiresAuth: false
                }
            },
            {
                path: 'register',
                name: 'Register',
                component: () => import('@/views/auth/Register.vue'),
                meta: {
                    layout: 'auth',
                    requiresAuth: false
                }
            }
        ]
    },
    {
        path: '/',
        redirect: '/case-converter'
    },
    {
        path: '/home',
        name: 'Home',
        component: () => import('@/components/Home.vue'),
        meta: { 
            title: '首页',
            icon: 'mdi-home'
        }
    },
    {
        path: '/tools',
        name: 'Tools',
        meta: {
            title: '工具',
            icon: 'mdi-tools'
        },
        children: [
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
                path: '/games/euler-circuit',
                name: 'EulerCircuit',
                component: () => import('@/views/games/EulerCircuit.vue'),
                meta: {
                    title: '欧拉回路求解',
                    icon: 'mdi-graph'
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
    history: createWebHistory(),
    routes
})

router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('token')
    
    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'Login' })
        return
    }
    
    if (isAuthenticated && to.meta.layout === 'auth') {
        next({ name: 'Home' })
        return
    }
    
    next()
})

export default router
