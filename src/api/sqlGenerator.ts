import request from '@/utils/request'

export interface SqlGeneratorRequest {
    account: string
    question: string
}

export interface SqlGeneratorResponse {
    sql: string
    preview_sql: string
    params: string[]
    result_columns: string[]
    explanation: string
    tables: string[]
}

export function generateMysqlAnalysisSql(payload: SqlGeneratorRequest) {
    return request.post<SqlGeneratorResponse>('/api/v1/sql-generator', payload)
}
