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
    snapshot_status?: string
    is_final?: boolean
    limit_up_pool: LimitUpStock[]
    sector_strength: SectorStrength[]
    advancement_candidates: CandidateStock[]
    candidates_2_to_3: CandidateStock[]
    divergence_consensus: DivergenceConsensusSignal[]
}

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

export interface StockKlineBar {
    trade_date: string
    open_price: number
    close_price: number
    high_price: number
    low_price: number
    volume: number
    amount: number
    amplitude?: number | null
    change_amount?: number | null
    change_percent?: number | null
    turnover_rate?: number | null
    ma5?: number | null
    ma10?: number | null
    ma20?: number | null
    ma30?: number | null
    ma60?: number | null
    dif?: number | null
    dea?: number | null
    macd?: number | null
    is_reseal_bar?: boolean
    is_breakout_bar?: boolean
}

export interface StockKlineSummary {
    latest_price: number
    change_amount?: number | null
    change_percent?: number | null
    open_price: number
    high_price: number
    low_price: number
    volume: number
    amount: number
    turnover_rate?: number | null
    ma5?: number | null
    ma10?: number | null
    ma20?: number | null
    ma30?: number | null
    ma60?: number | null
}

export interface IntradayTradingSignal {
    signal_type: string
    title: string
    phase: string
    signal_score: number
    observed_at: string
    reasons: string[]
    risks: string[]
}

export interface StockKlineSnapshot {
    code: string
    name: string
    period: string
    date: string
    bars: StockKlineBar[]
    summary?: StockKlineSummary | null
    technical_tags: string[]
    intraday_signals: IntradayTradingSignal[]
}

export function getMarketReview(params: { date?: string; refresh?: boolean }) {
    return request.get<ApiResponse<MarketReviewData>>('/api/v1/market-review', {params} as any)
}

export function getMarketRadar(params: {
    date?: string
    refresh?: boolean
    sector_limit?: number
    candidate_limit?: number
}) {
    return request.get<ApiResponse<MarketRadarData>>('/api/v1/market-review/radar', {params} as any)
}

export function getMarketRadarSectorStocks(
    sectorName: string,
    params: { date?: string; refresh?: boolean; limit?: number }
) {
    const encoded = encodeURIComponent(sectorName)
    return request.get<ApiResponse<MarketRadarSectorStock[]>>(
        `/api/v1/market-review/radar/sectors/${encoded}/stocks`,
        {params} as any
    )
}

export function getStockKline(
    code: string,
    params: { date?: string; limit?: number; refresh?: boolean; name?: string; period?: string }
) {
    return request.get<ApiResponse<StockKlineSnapshot>>(`/api/v1/market-review/kline/${code}`, {params} as any)
}
