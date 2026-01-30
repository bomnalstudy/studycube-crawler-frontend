import { prisma } from '@/lib/prisma'

/**
 * 기대 매출 예측 시스템
 *
 * 공식: 기대 매출 = 기저 매출 × 시즌 지수 × 외부 요인 지수 × 추세 계수
 */

export interface ForecastResult {
  expectedRevenue: number         // 예상 매출
  baseRevenue: number             // 기저 매출 (최근 평균)
  seasonIndex: number             // 시즌 지수
  externalFactorIndex: number     // 외부 요인 지수
  trendCoefficient: number        // 추세 계수
  breakdown: {
    baseRevenueReason: string
    seasonReason: string
    externalReason: string
    trendReason: string
  }
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'  // 예측 신뢰도
  dataMonths: number              // 분석에 사용된 데이터 월 수
}

/**
 * 지점의 월별 평균 매출 계산 (시즌 지수용)
 */
async function getMonthlyAverages(branchId: string): Promise<Map<number, { avg: number; count: number }>> {
  const metrics = await prisma.dailyMetric.findMany({
    where: { branchId },
    select: {
      date: true,
      totalRevenue: true,
    },
  })

  // 월별로 그룹화
  const monthlyData = new Map<number, number[]>()

  for (const m of metrics) {
    const month = m.date.getMonth() + 1 // 1-12
    if (!monthlyData.has(month)) {
      monthlyData.set(month, [])
    }
    monthlyData.get(month)!.push(Number(m.totalRevenue ?? 0))
  }

  // 월별 평균 계산
  const result = new Map<number, { avg: number; count: number }>()

  for (const [month, values] of monthlyData) {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length
    result.set(month, { avg, count: values.length })
  }

  return result
}

/**
 * 전체 평균 대비 해당 월의 시즌 지수 계산
 */
function calculateSeasonIndex(
  monthlyAverages: Map<number, { avg: number; count: number }>,
  targetMonth: number
): { index: number; reason: string } {
  if (monthlyAverages.size === 0) {
    return { index: 1.0, reason: '데이터 부족으로 시즌 지수 미적용' }
  }

  // 전체 평균
  let totalSum = 0
  let totalCount = 0
  for (const { avg, count } of monthlyAverages.values()) {
    totalSum += avg * count
    totalCount += count
  }
  const overallAvg = totalSum / totalCount

  // 해당 월 평균
  const monthData = monthlyAverages.get(targetMonth)
  if (!monthData) {
    return { index: 1.0, reason: `${targetMonth}월 데이터 없음, 시즌 지수 1.0 적용` }
  }

  const index = monthData.avg / overallAvg
  const percentDiff = ((index - 1) * 100).toFixed(1)
  const direction = index >= 1 ? '높음' : '낮음'

  return {
    index,
    reason: `${targetMonth}월은 연평균 대비 ${Math.abs(Number(percentDiff))}% ${direction} (데이터 ${monthData.count}일 기준)`,
  }
}

/**
 * 외부 요인의 과거 영향 계산
 */
async function getExternalFactorImpact(
  branchId: string,
  factorTypes: string[],
  eventStart: Date,
  eventEnd: Date
): Promise<{ index: number; reason: string }> {
  if (factorTypes.length === 0) {
    return { index: 1.0, reason: '외부 요인 없음' }
  }

  // 과거 동일 유형의 외부 요인 기간과 그 기간의 매출 변동 조회
  const pastFactors = await prisma.externalFactor.findMany({
    where: {
      type: { in: factorTypes },
      endDate: { lt: eventStart }, // 이벤트 이전에 종료된 것만
      branches: {
        some: { branchId },
      },
    },
    orderBy: { endDate: 'desc' },
    take: 5, // 최근 5개
  })

  if (pastFactors.length === 0) {
    return {
      index: 1.0,
      reason: `과거 ${factorTypes.join(', ')} 데이터 없음, 외부 요인 지수 1.0 적용`
    }
  }

  // 각 과거 외부 요인 기간의 매출과 그 전후 매출 비교
  const impacts: number[] = []

  for (const factor of pastFactors) {
    // 외부 요인 기간 매출
    const factorMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId,
        date: { gte: factor.startDate, lte: factor.endDate },
      },
    })

    // 외부 요인 직전 기간 매출 (같은 일수)
    const durationDays = Math.ceil((factor.endDate.getTime() - factor.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const beforeStart = new Date(factor.startDate)
    beforeStart.setDate(beforeStart.getDate() - durationDays)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId,
        date: { gte: beforeStart, lt: factor.startDate },
      },
    })

    if (factorMetrics.length > 0 && beforeMetrics.length > 0) {
      const factorAvg = factorMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / factorMetrics.length
      const beforeAvg = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / beforeMetrics.length

      if (beforeAvg > 0) {
        impacts.push(factorAvg / beforeAvg)
      }
    }
  }

  if (impacts.length === 0) {
    return {
      index: 1.0,
      reason: `${factorTypes.join(', ')} 과거 영향 데이터 부족`
    }
  }

  const avgImpact = impacts.reduce((sum, i) => sum + i, 0) / impacts.length
  const percentDiff = ((avgImpact - 1) * 100).toFixed(1)
  const direction = avgImpact >= 1 ? '상승' : '하락'

  return {
    index: avgImpact,
    reason: `과거 ${factorTypes.join(', ')} 기간 평균 ${Math.abs(Number(percentDiff))}% ${direction} (${impacts.length}회 기준)`,
  }
}

/**
 * 추세 계수 계산 (전년 동월 대비)
 */
async function getTrendCoefficient(
  branchId: string,
  targetMonth: number,
  targetYear: number
): Promise<{ coefficient: number; reason: string }> {
  // 올해 해당 월 데이터 (이벤트 시작 전까지)
  const thisYearStart = new Date(targetYear, targetMonth - 1, 1)
  const thisYearEnd = new Date(targetYear, targetMonth, 0) // 해당 월 마지막 날

  const thisYearMetrics = await prisma.dailyMetric.findMany({
    where: {
      branchId,
      date: { gte: thisYearStart, lte: thisYearEnd },
    },
  })

  // 작년 해당 월 데이터
  const lastYearStart = new Date(targetYear - 1, targetMonth - 1, 1)
  const lastYearEnd = new Date(targetYear - 1, targetMonth, 0)

  const lastYearMetrics = await prisma.dailyMetric.findMany({
    where: {
      branchId,
      date: { gte: lastYearStart, lte: lastYearEnd },
    },
  })

  if (thisYearMetrics.length === 0 || lastYearMetrics.length === 0) {
    // 데이터가 없으면 전체 추세로 계산
    const recentMonths = await prisma.dailyMetric.findMany({
      where: { branchId },
      orderBy: { date: 'desc' },
      take: 180, // 최근 6개월
    })

    if (recentMonths.length < 60) {
      return { coefficient: 1.0, reason: '추세 계산을 위한 데이터 부족, 추세 계수 1.0 적용' }
    }

    // 최근 3개월 vs 이전 3개월
    const recent90 = recentMonths.slice(0, 90)
    const prev90 = recentMonths.slice(90, 180)

    const recentAvg = recent90.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / recent90.length
    const prevAvg = prev90.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / prev90.length

    if (prevAvg === 0) {
      return { coefficient: 1.0, reason: '이전 기간 매출 0, 추세 계수 1.0 적용' }
    }

    const coefficient = recentAvg / prevAvg
    const percentDiff = ((coefficient - 1) * 100).toFixed(1)
    const direction = coefficient >= 1 ? '성장' : '하락'

    return {
      coefficient,
      reason: `최근 3개월 기준 ${Math.abs(Number(percentDiff))}% ${direction} 추세`,
    }
  }

  const thisYearAvg = thisYearMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / thisYearMetrics.length
  const lastYearAvg = lastYearMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / lastYearMetrics.length

  if (lastYearAvg === 0) {
    return { coefficient: 1.0, reason: '전년 매출 0, 추세 계수 1.0 적용' }
  }

  const coefficient = thisYearAvg / lastYearAvg
  const percentDiff = ((coefficient - 1) * 100).toFixed(1)
  const direction = coefficient >= 1 ? '성장' : '하락'

  return {
    coefficient,
    reason: `전년 ${targetMonth}월 대비 ${Math.abs(Number(percentDiff))}% ${direction}`,
  }
}

/**
 * 유사 지점 찾기 및 예측
 */
async function getFallbackFromSimilarBranch(
  branchId: string,
  targetMonth: number,
  eventDays: number,
  externalFactorTypes: string[]
): Promise<ForecastResult | null> {
  // 현재 지점 정보 (특성 필드가 있으면 사용)
  const currentBranch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      region: true,
      size: true,
      targetAudience: true,
    },
  })

  // 다른 지점들 조회 (데이터가 충분한 지점만)
  const otherBranches = await prisma.branch.findMany({
    where: {
      id: { not: branchId },
    },
    select: {
      id: true,
      name: true,
      region: true,
      size: true,
      targetAudience: true,
    },
  })

  // 각 지점의 데이터 양 확인하고 유사도 점수 계산
  type BranchScore = {
    branchId: string
    branchName: string
    similarityScore: number
    dataCount: number
  }

  const branchScores: BranchScore[] = []

  for (const other of otherBranches) {
    // 데이터 개수 확인
    const dataCount = await prisma.dailyMetric.count({
      where: { branchId: other.id },
    })

    if (dataCount < 90) continue // 최소 90일 데이터 필요

    // 유사도 점수 계산
    let similarityScore = 0

    // 지역 일치
    if (currentBranch?.region && other.region === currentBranch.region) {
      similarityScore += 3
    }
    // 규모 일치
    if (currentBranch?.size && other.size === currentBranch.size) {
      similarityScore += 2
    }
    // 타겟층 일치
    if (currentBranch?.targetAudience && other.targetAudience === currentBranch.targetAudience) {
      similarityScore += 2
    }

    branchScores.push({
      branchId: other.id,
      branchName: other.name,
      similarityScore,
      dataCount,
    })
  }

  // 유사도 점수 높은 순 + 데이터 많은 순 정렬
  branchScores.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore
    }
    return b.dataCount - a.dataCount
  })

  // 가장 유사한 지점 선택
  const similarBranch = branchScores[0]
  if (!similarBranch) return null

  // 해당 지점의 예측 계산
  const recentMetrics = await prisma.dailyMetric.findMany({
    where: { branchId: similarBranch.branchId },
    orderBy: { date: 'desc' },
    take: 90,
  })

  if (recentMetrics.length === 0) return null

  const baseRevenue = recentMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / recentMetrics.length
  const dataMonths = Math.ceil(recentMetrics.length / 30)

  // 시즌 지수 (유사 지점 기준)
  const monthlyAverages = await getMonthlyAverages(similarBranch.branchId)
  const { index: seasonIndex, reason: seasonReason } = calculateSeasonIndex(monthlyAverages, targetMonth)

  // 외부 요인은 동일하게 적용
  const expectedDailyRevenue = baseRevenue * seasonIndex
  const expectedRevenue = expectedDailyRevenue * eventDays

  return {
    expectedRevenue: Math.round(expectedRevenue),
    baseRevenue: Math.round(baseRevenue),
    seasonIndex: Math.round(seasonIndex * 100) / 100,
    externalFactorIndex: 1.0,
    trendCoefficient: 1.0,
    breakdown: {
      baseRevenueReason: `유사 지점(${similarBranch.branchName}) 기준 평균 일 매출: ${Math.round(baseRevenue).toLocaleString()}원`,
      seasonReason: `유사 지점 기준 - ${seasonReason}`,
      externalReason: '유사 지점 기준 외부 요인 미적용',
      trendReason: '유사 지점 기준 추세 미적용',
    },
    confidence: 'LOW',
    dataMonths,
  }
}

/**
 * 기대 매출 예측 메인 함수
 */
export async function forecastRevenue(
  branchId: string,
  eventStart: Date,
  eventEnd: Date,
  externalFactorTypes: string[] = []
): Promise<ForecastResult> {
  const targetMonth = eventStart.getMonth() + 1
  const targetYear = eventStart.getFullYear()
  const eventDays = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // 1. 기저 매출 (최근 90일 평균 일 매출)
  const recentMetrics = await prisma.dailyMetric.findMany({
    where: { branchId },
    orderBy: { date: 'desc' },
    take: 90,
  })

  // 데이터 부족 시 유사 지점 기반 예측
  if (recentMetrics.length < 30) {
    const fallback = await getFallbackFromSimilarBranch(branchId, targetMonth, eventDays, externalFactorTypes)
    if (fallback) {
      return fallback
    }

    return {
      expectedRevenue: 0,
      baseRevenue: 0,
      seasonIndex: 1,
      externalFactorIndex: 1,
      trendCoefficient: 1,
      breakdown: {
        baseRevenueReason: '데이터 없음 (유사 지점도 찾지 못함)',
        seasonReason: '데이터 없음',
        externalReason: '데이터 없음',
        trendReason: '데이터 없음',
      },
      confidence: 'LOW',
      dataMonths: 0,
    }
  }

  const baseRevenue = recentMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0) / recentMetrics.length
  const dataMonths = Math.ceil(recentMetrics.length / 30)

  // 2. 시즌 지수
  const monthlyAverages = await getMonthlyAverages(branchId)
  const { index: seasonIndex, reason: seasonReason } = calculateSeasonIndex(monthlyAverages, targetMonth)

  // 3. 외부 요인 지수
  const { index: externalFactorIndex, reason: externalReason } = await getExternalFactorImpact(
    branchId,
    externalFactorTypes,
    eventStart,
    eventEnd
  )

  // 4. 추세 계수
  const { coefficient: trendCoefficient, reason: trendReason } = await getTrendCoefficient(
    branchId,
    targetMonth,
    targetYear
  )

  // 기대 매출 계산 (일 매출 × 이벤트 일수)
  const expectedDailyRevenue = baseRevenue * seasonIndex * externalFactorIndex * trendCoefficient
  const expectedRevenue = expectedDailyRevenue * eventDays

  // 신뢰도 결정
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  if (dataMonths >= 12 && monthlyAverages.size >= 10) {
    confidence = 'HIGH'
  } else if (dataMonths >= 6 && monthlyAverages.size >= 6) {
    confidence = 'MEDIUM'
  } else {
    confidence = 'LOW'
  }

  return {
    expectedRevenue: Math.round(expectedRevenue),
    baseRevenue: Math.round(baseRevenue),
    seasonIndex: Math.round(seasonIndex * 100) / 100,
    externalFactorIndex: Math.round(externalFactorIndex * 100) / 100,
    trendCoefficient: Math.round(trendCoefficient * 100) / 100,
    breakdown: {
      baseRevenueReason: `최근 ${recentMetrics.length}일 평균 일 매출: ${Math.round(baseRevenue).toLocaleString()}원`,
      seasonReason,
      externalReason,
      trendReason,
    },
    confidence,
    dataMonths,
  }
}

/**
 * 예측 대비 성과 계산
 */
export function calculatePerformanceVsForecast(
  actualRevenue: number,
  forecast: ForecastResult
): {
  vsExpected: number       // 예측 대비 성과 (%)
  vsExpectedAmount: number // 예측 대비 금액 차이
  interpretation: string   // 해석
} {
  if (forecast.expectedRevenue === 0) {
    return {
      vsExpected: actualRevenue > 0 ? 100 : 0,
      vsExpectedAmount: actualRevenue,
      interpretation: '예측 데이터 없음',
    }
  }

  const vsExpected = ((actualRevenue - forecast.expectedRevenue) / forecast.expectedRevenue) * 100
  const vsExpectedAmount = actualRevenue - forecast.expectedRevenue

  let interpretation: string
  if (vsExpected >= 15) {
    interpretation = '예상보다 크게 상회 (이벤트 효과 뚜렷)'
  } else if (vsExpected >= 5) {
    interpretation = '예상 상회 (이벤트 효과 있음)'
  } else if (vsExpected >= -5) {
    interpretation = '예상과 비슷 (이벤트 효과 미미)'
  } else if (vsExpected >= -15) {
    interpretation = '예상 하회 (이벤트 효과 없거나 부정적)'
  } else {
    interpretation = '예상보다 크게 하회 (문제 점검 필요)'
  }

  return {
    vsExpected: Math.round(vsExpected * 100) / 100,
    vsExpectedAmount: Math.round(vsExpectedAmount),
    interpretation,
  }
}
