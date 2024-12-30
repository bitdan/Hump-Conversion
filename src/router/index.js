import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/Home.vue'
import CaseConverter from '../components/CaseConverter.vue'
import StringGenerator from "../components/StringGenerator.vue";

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { title: '首页' }  // 使用 meta 存储显示名称
    },
    {
        path: '/case-converter',
        name: 'CaseConverter',
        component: CaseConverter,
        meta: { title: '大小写转换' }  // 使用 meta 存储显示名称
    },
    {
        path: '/string-generator',
        name: 'StringGenerator',
        component: StringGenerator,
        meta: { title: '字符串生成' }  // 使用 meta 存储显示名称
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
