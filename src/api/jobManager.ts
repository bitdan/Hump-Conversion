import request from '@/utils/request'

export interface ApiResponse<T> {
    code: number
    msg: string
    data: T
}

export interface JobParamDefinition {
    key: string
    label: string
    type: 'date' | 'text' | 'number' | 'select'
    placeholder?: string
    options?: string[]
}

export interface JobDefinition {
    id: string
    name: string
    description: string
    params: JobParamDefinition[]
}

export interface JobRunRecord {
    run_id: string
    job_id: string
    job_name: string
    status: string
    params: Record<string, any>
    message: string
    total_codes: number
    success_count: number
    failed_count: number
    saved_rows: number
    created_at: string
    started_at?: string | null
    finished_at?: string | null
}

export function getJobs() {
    return request.get<ApiResponse<JobDefinition[]>>('/api/v1/jobs')
}

export function getJobRuns(limit = 50) {
    return request.get<ApiResponse<JobRunRecord[]>>('/api/v1/jobs/runs', {params: {limit}} as any)
}

export function runJob(jobId: string, params: Record<string, any>) {
    return request.post<ApiResponse<JobRunRecord>>(`/api/v1/jobs/${jobId}/run`, {params})
}
