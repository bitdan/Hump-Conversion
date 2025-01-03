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
                path: '/case-converter',
                name: 'CaseConverter',
                component: CaseConverter,
                meta: { 
                    title: '驼峰转换',
                    icon: 'mdi-format-text'
                }
            },
            {
                path: '/string-generator',
                name: 'StringGenerator',
                component: StringGenerator,
                meta: { 
                    title: '字符串生成',
                    icon: 'mdi-format-letter-case'
                }
            },
            {
                path: '/timestamp',
                name: 'timestamp',
                component: TimestampTool,
                meta: {
                    title: '时间戳工具',
                    icon: 'mdi-clock-outline'
                }
            },
            {
                path: '/data-encryption',
                name: 'DataEncryption',
                component: DataEncryption,
                meta: { 
                    title: '数据加密解密',
                    icon: 'mdi-shield-lock-outline'
                }
            },
            {
                path: '/file-converter',
                name: 'FileConverter',
                component: FileConverter,
                meta: {
                    title: '文件格式转换',
                    icon: 'mdi-file-sync'
                }
            },
            {
                path: '/json-to-entity',
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
                path: '/games/dice-roller',
                name: 'DiceRoller',
                component: DiceRoller,
                meta: {
                    title: '投色子',
                    icon: 'mdi-dice-6'
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
