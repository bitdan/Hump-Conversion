import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CaseConverter from '../views/tools/CaseConverter.vue'
import StringGenerator from "../views/tools/StringGenerator.vue";
import TimestampTool from '../views/tools/TimestampTool.vue'
import TicTacToe from '../views/games/TicTacToe.vue'
import DataEncryption from '../views/tools/DataEncryption.vue'
import FileConverter from '../views/tools/FileConverter.vue'
import PuzzleGame from '../views/games/PuzzleGame.vue'
import JsonToEntity from '../views/tools/JsonToEntity.vue'
import Gomoku from '../views/games/Gomoku.vue'
import EulerCircuit from '../views/games/EulerCircuit.vue'
import DiceRoller from '../views/games/DiceRoller.vue'
import Go from '../views/games/Go.vue'
import ChineseChess from '../views/games/ChineseChess.vue'

export const routes = [
    {
        path: '/',
        redirect: '/case-converter'
    },
    {
        path: '/home',
        name: 'Home',
        component: Home,
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
                component: CaseConverter,
                meta: { 
                    title: '驼峰转换',
                    icon: 'mdi-format-letter-case'
                }
            },
            {
                path: '/tools/string-generator',
                name: 'StringGenerator',
                component: StringGenerator,
                meta: { 
                    title: '字符串生成',
                    icon: 'mdi-format-letter-case'
                }
            },
            {
                path: '/tools/timestamp',
                name: 'timestamp',
                component: TimestampTool,
                meta: {
                    title: '时间戳工具',
                    icon: 'mdi-clock-outline'
                }
            },
            {
                path: '/tools/data-encryption',
                name: 'DataEncryption',
                component: DataEncryption,
                meta: { 
                    title: '数据加密解密',
                    icon: 'mdi-shield-lock-outline'
                }
            },
            {
                path: '/tools/file-converter',
                name: 'FileConverter',
                component: FileConverter,
                meta: {
                    title: '文件格式转换',
                    icon: 'mdi-file-sync'
                }
            },
            {
                path: '/tools/json-to-entity',
                name: 'JsonToEntity',
                component: JsonToEntity,
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
                component: DiceRoller,
                meta: {
                    title: '投色子',
                    icon: 'mdi-dice-6'
                }
            },
            {
                path: '/games/tic-tac-toe',
                name: 'TicTacToe',
                component: TicTacToe,
                meta: { 
                    title: '井字棋',
                    icon: 'mdi-grid'
                }
            },
            {
                path: '/games/puzzle',
                name: 'PuzzleGame',
                component: PuzzleGame,
                meta: {
                    title: '拼图游戏',
                    icon: 'mdi-puzzle'
                }
            },
            {
                path: '/games/euler-circuit',
                name: 'EulerCircuit',
                component: EulerCircuit,
                meta: {
                    title: '欧拉回路求解',
                    icon: 'mdi-graph'
                }
            },
            {
                path: '/games/gomoku',
                name: 'Gomoku',
                component: Gomoku,
                meta: {
                    title: '五子棋',
                    icon: 'mdi-chess-queen'
                }
            },
            {
                path: '/games/go',
                name: 'Go',
                component: Go,
                meta: {
                    title: '围棋',
                    icon: 'mdi-circle-outline'
                }
            },
            {
                path: '/games/chinese-chess',
                name: 'ChineseChess',
                component: ChineseChess,
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
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
