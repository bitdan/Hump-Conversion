import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CaseConverter from '../components/CaseConverter.vue'
import StringGenerator from "../components/StringGenerator.vue";
import TimestampTool from '../components/TimestampTool.vue'
import TicTacToe from '../components/TicTacToe.vue'
import DataEncryption from '../components/DataEncryption.vue'
import FileConverter from '../components/FileConverter.vue'
import PuzzleGame from '../components/PuzzleGame.vue'
import JsonToEntity from '../components/JsonToEntity.vue'
import Gomoku from '../components/Gomoku.vue'
import EulerCircuit from '../components/EulerCircuit.vue'
import DiceRoller from '../components/DiceRoller.vue'

const routes = [
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
        path: '/ticTacToe',
        name: 'TicTacToe',
        component: TicTacToe,
        meta: { 
            title: '井字棋',
            icon: 'mdi-grid'
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
          icon: 'mdi-file-convert'
        }
    },
    {
        path: '/puzzle-game',
        name: 'PuzzleGame',
        component: PuzzleGame,
        meta: {
          title: '拼图游戏',
          icon: 'mdi-puzzle'
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
    },
    {
        path: '/euler-circuit',
        name: 'EulerCircuit',
        component: EulerCircuit,
        meta: {
            title: '欧拉回路求解',
            icon: 'mdi-graph'
        }
    },
    {
        path: '/gomoku',
        name: 'Gomoku',
        component: Gomoku,
        meta: {
            title: '五子棋',
            icon: 'mdi-chess-queen'
        }
    },
    {
        path: '/dice-roller',
        name: 'DiceRoller',
        component: DiceRoller,
        meta: {
            title: '投色子',
            icon: 'mdi-dice-6'
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
