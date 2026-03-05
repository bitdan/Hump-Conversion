import request from '@/utils/request';

// 定义 LangGraph 数据结构
export interface LangGraphTraceStep {
    node: string;
    input_summary: string;
    output_summary: string;
    decision: string;
    latency_ms: number;
}

export interface LangGraphData {
  topic: string;
  draft: string;
  corrections: string[];
  attempts: number;
    trace?: LangGraphTraceStep[];
}

// 从 API 获取 LangGraph 数据
export function getLangGraphData(topic: string) {
  return request.post<LangGraphData>('/api/v1/chat', { topic });
}
