import request from '@/utils/request'
import type {ApiResponse} from './types'

export interface LimitUpStock {
    code: string
    name: string
    industry: string
    latest_price?: number | null
    change_percent?: number | null
    turnover_rate?: number | null
    amount?: number | null
    circulating_market_value?: number | null
    seal_amount?: number | null
    first_limit_time: string
    last_limit_time: string
    open_count?: number | null
    consecutive_boards: number
    limit_up_stat: string
}

export interface SectorStrength {
    industry: string
    limit_up_count: number
    advanced_count: number
    max_consecutive_boards: number
    total_seal_amount: number
    total_amount: number
    open_count: number
    core_stocks: string[]
}

export interface MarketReviewData {
    date: string
    snapshot_status?: string
    is_final?: boolean
    limit_up_pool: LimitUpStock[]
    sector_strength: SectorStrength[]
}

export interface MarketReviewParams {
    date?: string
    refresh?: boolean
}

export function getMarketReview(params: MarketReviewParams) {
    return request.get<ApiResponse<MarketReviewData>>('/api/v1/market-review', {params} as any)
}
