/**
 * 매출 지표 관련 DB 유틸리티
 *
 * 모든 API에서 재사용 가능한 최적화된 쿼리 함수들
 */

import { prisma } from '@/lib/prisma'

export interface DateRange {
  start: Date
  end: Date
}

export interface MetricsSummary {
  totalRevenue: number
  dayTicketRevenue: number
  timeTicketRevenue: number
  termTicketRevenue: number
  fixedTicketRevenue: number
  daysCount: number
}

export interface MetricsComparison {
  current: MetricsSummary
  previous: MetricsSummary
  growth: {
    totalRevenue: number
    dayTicket: number
    timeTicket: number
    termTicket: number
    fixedTicket: number
  }
}

/**
 * 단일 지점의 기간별 매출 요약 조회
 */
export async function getMetricsSummary(
  branchId: string,
  range: DateRange
): Promise<MetricsSummary> {
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      branchId,
      date: { gte: range.start, lte: range.end },
    },
    select: {
      totalRevenue: true,
      dayTicketRevenue: true,
      timeTicketRevenue: true,
      termTicketRevenue: true,
    },
  })

  return {
    totalRevenue: metrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0),
    dayTicketRevenue: metrics.reduce((sum, m) => sum + Number(m.dayTicketRevenue ?? 0), 0),
    timeTicketRevenue: metrics.reduce((sum, m) => sum + Number(m.timeTicketRevenue ?? 0), 0),
    termTicketRevenue: metrics.reduce((sum, m) => sum + Number(m.termTicketRevenue ?? 0), 0),
    fixedTicketRevenue: 0, // 별도 필드 없으면 0
    daysCount: metrics.length,
  }
}

/**
 * 여러 지점의 기간별 매출 요약 일괄 조회 (배치)
 */
export async function getMetricsSummaryBatch(
  branchIds: string[],
  range: DateRange
): Promise<Map<string, MetricsSummary>> {
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      branchId: { in: branchIds },
      date: { gte: range.start, lte: range.end },
    },
    select: {
      branchId: true,
      totalRevenue: true,
      dayTicketRevenue: true,
      timeTicketRevenue: true,
      termTicketRevenue: true,
    },
  })

  // 지점별로 그룹화
  const resultMap = new Map<string, MetricsSummary>()

  // 초기화
  for (const branchId of branchIds) {
    resultMap.set(branchId, {
      totalRevenue: 0,
      dayTicketRevenue: 0,
      timeTicketRevenue: 0,
      termTicketRevenue: 0,
      fixedTicketRevenue: 0,
      daysCount: 0,
    })
  }

  // 집계
  for (const m of metrics) {
    const summary = resultMap.get(m.branchId)!
    summary.totalRevenue += Number(m.totalRevenue ?? 0)
    summary.dayTicketRevenue += Number(m.dayTicketRevenue ?? 0)
    summary.timeTicketRevenue += Number(m.timeTicketRevenue ?? 0)
    summary.termTicketRevenue += Number(m.termTicketRevenue ?? 0)
    summary.daysCount++
  }

  return resultMap
}

/**
 * 지점별 가장 오래된 데이터 날짜 일괄 조회
 */
export async function getOldestDataDates(
  branchIds: string[]
): Promise<Map<string, Date | null>> {
  const results = await Promise.all(
    branchIds.map(async (branchId) => {
      const oldest = await prisma.dailyMetric.findFirst({
        where: { branchId },
        orderBy: { date: 'asc' },
        select: { date: true },
      })
      return { branchId, date: oldest?.date ?? null }
    })
  )

  return new Map(results.map((r) => [r.branchId, r.date]))
}

/**
 * 월별 평균 매출 계산 (시즌 지수용)
 */
export async function getMonthlyAverages(
  branchId: string
): Promise<Map<number, { avg: number; count: number }>> {
  const metrics = await prisma.dailyMetric.findMany({
    where: { branchId },
    select: {
      date: true,
      totalRevenue: true,
    },
  })

  const monthlyData = new Map<number, number[]>()

  for (const m of metrics) {
    const month = m.date.getMonth() + 1
    if (!monthlyData.has(month)) {
      monthlyData.set(month, [])
    }
    monthlyData.get(month)!.push(Number(m.totalRevenue ?? 0))
  }

  const result = new Map<number, { avg: number; count: number }>()

  for (const [month, values] of monthlyData) {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    result.set(month, { avg, count: values.length })
  }

  return result
}

/**
 * 두 기간 매출 비교 (성장률 계산)
 */
export async function compareMetrics(
  branchId: string,
  currentRange: DateRange,
  previousRange: DateRange
): Promise<MetricsComparison> {
  const [current, previous] = await Promise.all([
    getMetricsSummary(branchId, currentRange),
    getMetricsSummary(branchId, previousRange),
  ])

  const calculateGrowth = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  return {
    current,
    previous,
    growth: {
      totalRevenue: calculateGrowth(current.totalRevenue, previous.totalRevenue),
      dayTicket: calculateGrowth(current.dayTicketRevenue, previous.dayTicketRevenue),
      timeTicket: calculateGrowth(current.timeTicketRevenue, previous.timeTicketRevenue),
      termTicket: calculateGrowth(current.termTicketRevenue, previous.termTicketRevenue),
      fixedTicket: calculateGrowth(current.fixedTicketRevenue, previous.fixedTicketRevenue),
    },
  }
}

/**
 * 여러 지점 두 기간 매출 비교 (배치)
 */
export async function compareMetricsBatch(
  branchIds: string[],
  currentRange: DateRange,
  previousRange: DateRange
): Promise<Map<string, MetricsComparison>> {
  const [currentBatch, previousBatch] = await Promise.all([
    getMetricsSummaryBatch(branchIds, currentRange),
    getMetricsSummaryBatch(branchIds, previousRange),
  ])

  const calculateGrowth = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  const result = new Map<string, MetricsComparison>()

  for (const branchId of branchIds) {
    const current = currentBatch.get(branchId)!
    const previous = previousBatch.get(branchId)!

    result.set(branchId, {
      current,
      previous,
      growth: {
        totalRevenue: calculateGrowth(current.totalRevenue, previous.totalRevenue),
        dayTicket: calculateGrowth(current.dayTicketRevenue, previous.dayTicketRevenue),
        timeTicket: calculateGrowth(current.timeTicketRevenue, previous.timeTicketRevenue),
        termTicket: calculateGrowth(current.termTicketRevenue, previous.termTicketRevenue),
        fixedTicket: calculateGrowth(current.fixedTicketRevenue, previous.fixedTicketRevenue),
      },
    })
  }

  return result
}

/**
 * 일별 매출 데이터 조회 (통계 분석용)
 */
export async function getDailyRevenues(
  branchId: string,
  range: DateRange
): Promise<number[]> {
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      branchId,
      date: { gte: range.start, lte: range.end },
    },
    orderBy: { date: 'asc' },
    select: { totalRevenue: true },
  })

  return metrics.map((m) => Number(m.totalRevenue ?? 0))
}

/**
 * 여러 지점 일별 매출 데이터 조회 (배치)
 */
export async function getDailyRevenuesBatch(
  branchIds: string[],
  range: DateRange
): Promise<Map<string, number[]>> {
  const metrics = await prisma.dailyMetric.findMany({
    where: {
      branchId: { in: branchIds },
      date: { gte: range.start, lte: range.end },
    },
    orderBy: { date: 'asc' },
    select: { branchId: true, date: true, totalRevenue: true },
  })

  const result = new Map<string, number[]>()
  for (const branchId of branchIds) {
    result.set(branchId, [])
  }

  for (const m of metrics) {
    result.get(m.branchId)!.push(Number(m.totalRevenue ?? 0))
  }

  return result
}
