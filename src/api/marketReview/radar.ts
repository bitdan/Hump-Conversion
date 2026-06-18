import request from '@/utils/request'
import type {ApiResponse} from './types'

export interface MarketEnvironment {
    trade_date: string
    total_amount: number
    amount_change_percent: number
    rise_count: number
    fall_count: number
    flat_count: number
    limit_up_count: number
    limit_down_count: number
    max_boards: number
    environment_score: number
    source: string
}

export interface MarketRadarSector {
    sector_name: string
    sector_type: string
    heat_score: number
    momentum_score: number
    liquidity_score: number
    breadth_score: number
    limit_up_count: number
    strong_stock_count: number
    stock_count: number
    rise_count: number
    change_percent: number
    total_amount: number
    core_stocks: string[]
    reasons: string[]
    risks: string[]
}

export interface MarketRadarCandidate {
    code: string
    name: string
    industry: string
    latest_price?: number | null
    change_percent?: number | null
    turnover_rate?: number | null
    amount?: number | null
    candidate_score: number
    sector_heat_score: number
    signal_type: string
    reasons: string[]
    risks: string[]
    tags: string[]
}

export interface MarketRadarSectorStock {
    code: string
    name: string
    industry: string
    latest_price?: number | null
    change_percent?: number | null
    turnover_rate?: number | null
    amount?: number | null
    sector_heat_score: number
    stock_score: number
    trend_score: number
    volume_score: number
    relative_strength_score: number
    ma_state: string
    return_5d?: number | null
    return_10d?: number | null
    return_20d?: number | null
    volume_ratio_5d?: number | null
    reasons: string[]
    risks: string[]
    tags: string[]
    trend_tags: string[]
}

export interface MarketRadarData {
    date: string
    market_environment?: MarketEnvironment | null
    sectors: MarketRadarSector[]
    candidates: MarketRadarCandidate[]
    generated_at: string
}

export interface MarketRadarParams {
    date?: string
    refresh?: boolean
    sector_limit?: number
    candidate_limit?: number
}

export interface MarketRadarSectorStocksParams {
    date?: string
    refresh?: boolean
    limit?: number
}

export function getMarketRadar(params: MarketRadarParams) {
    return request.get<ApiResponse<MarketRadarData>>('/api/v1/market-review/radar', {params} as any)
}

export function getMarketRadarSectorStocks(
    sectorName: string,
    params: MarketRadarSectorStocksParams
) {
    const encoded = encodeURIComponent(sectorName)
    return request.get<ApiResponse<MarketRadarSectorStock[]>>(
        `/api/v1/market-review/radar/sectors/${encoded}/stocks`,
        {params} as any
    )
}

