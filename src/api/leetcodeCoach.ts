import request from '@/utils/request'

export interface LeetCodeCoachRequest {
    title: string
    problem_statement: string
    constraints?: string[]
    examples?: string[]
    code: string
    language?: string
    user_question?: string
    mode?: 'hint' | 'review' | 'teach' | 'mock'
}

export interface LeetCodeCoachResponse {
    understanding: string
    key_observations: string[]
    hint: string
    complexity_analysis: string
    review_findings: string[]
    next_step: string
    similar_patterns: string[]
    mode: string
    source: string
}

export function getLeetCodeCoachData(data: LeetCodeCoachRequest) {
    return request.post<LeetCodeCoachResponse>('/api/v1/leetcode/coach', data)
}
