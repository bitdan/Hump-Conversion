import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CaseConverter from '../components/CaseConverter.vue'
import StringGenerator from "../components/StringGenerator.vue";
import TimestampTool from '../components/TimestampTool.vue'
import TicTacToe from '../components/TicTacToe.vue'
import DataEncryption from '../components/DataEncryption.vue'

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
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
