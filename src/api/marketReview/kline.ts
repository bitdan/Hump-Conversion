import request from '@/utils/request'
import type {ApiResponse} from './types'

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

export interface StockKlineParams {
    date?: string
    limit?: number
    refresh?: boolean
    name?: string
    period?: string
}

export function getStockKline(
    code: string,
    params: StockKlineParams
) {
    return request.get<ApiResponse<StockKlineSnapshot>>(`/api/v1/market-review/kline/${code}`, {params} as any)
}

