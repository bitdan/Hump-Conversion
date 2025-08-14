// src/api/langGraph.ts
import axios from 'axios';

// 定义 LangGraph 数据结构
export interface LangGraphData {
  topic: string;
  draft: string;
  corrections: string[];
  attempts: number;
}

// 创建 axios 实例（可全局复用）
const http = axios.create({
  baseURL: 'http://0.0.0.0:8000/api/v1', // 统一前缀
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 从 API 获取 LangGraph 数据
export function getLangGraphData(topic: string) {
  return http.post<LangGraphData>('/chat', { topic });
}
