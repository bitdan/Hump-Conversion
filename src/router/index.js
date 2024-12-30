// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import CaseConverter from '../components/CaseConverter.vue'

// 定义路由
const routes = [
    {
        path: '/',
        name: 'Home',
        component: CaseConverter
    },
    {
        path: '/case-converter',
        name: 'CaseConverter',
        component: CaseConverter
    }
    // 可以添加更多路由...
]

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
