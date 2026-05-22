import request from '@/utils/request'

export interface ApiResponse<T> {
    code: number
    msg: string
    data: T
}

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
    board_quality_score: number
    tags: string[]
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
    strength_score: number
    risk_tags: string[]
}

export interface CandidateStock {
    stock: LimitUpStock
    sector?: SectorStrength | null
    pool_type: string
    target_boards: number
    candidate_score: number
    level: string
    reasons: string[]
    risks: string[]
}

export interface DivergenceConsensusSignal {
    code: string
    name: string
    industry: string
    phase: string
    signal_score: number
    reasons: string[]
    risks: string[]
}

export interface MarketReviewData {
    date: string
    limit_up_pool: LimitUpStock[]
    sector_strength: SectorStrength[]
    advancement_candidates: CandidateStock[]
    candidates_2_to_3: CandidateStock[]
    divergence_consensus: DivergenceConsensusSignal[]
}

export function getMarketReview(params: { date?: string }) {
    return request.get<ApiResponse<MarketReviewData>>('/api/v1/market-review', {params} as any)
}
