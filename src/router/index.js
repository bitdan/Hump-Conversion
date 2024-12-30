import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'  // 新增引入
import CaseConverter from '../components/CaseConverter.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home  // 使用新的 Home 组件
    },
    {
        path: '/case-converter',
        name: 'CaseConverter',
        component: CaseConverter
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
