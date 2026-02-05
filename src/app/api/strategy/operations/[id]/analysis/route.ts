import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { tTest, cohensD, calculateGrowthRate } from '@/lib/strategy/statistics'
import { forecastRevenue, calculatePerformanceVsForecast } from '@/lib/strategy/forecast'
import { trackSegmentChangesWithComparison, trackTicketUpgrades } from '@/lib/strategy/segment-tracker'
import { db, type DateRange } from '@/lib/db'
import {
  calculateVisitPattern,
  calculateScoreWithBreakdown,
  determineVerdict,
  inferTicketCategory,
} from '@/lib/strategy/analysis-utils'
import {
  computeSummary,
  savePerformanceToDB,
  loadSavedPerformances,
  getSavedAnalysisDate,
} from '@/lib/strategy/operation-performance-db'
import type {
  OperationPerformanceData,
  ComparisonType,
  TicketTypeChangeData,
  TicketUpgradeData,
} from '@/types/strategy'

/** 기간별 분석 범위 계산 (적용일 기준) */
function getPeriodRange(implementedAt: Date, months: number): DateRange {
  const start = new Date(implementedAt)
  const end = new Date(implementedAt)
  end.setMonth(end.getMonth() + months)
  end.setDate(end.getDate() - 1)
  return { start, end }
}

/** YoY 비교 범위 계산 */
function getYoyRange(range: DateRange): DateRange {
  return {
    start: new Date(range.start.getFullYear() - 1, range.start.getMonth(), range.start.getDate()),
    end: new Date(range.end.getFullYear() - 1, range.end.getMonth(), range.end.getDate()),
  }
}

/** 이용권 유형별 매출 변화 계산 */
async function calculateTicketTypeChanges(
  branchId: string,
  afterRange: DateRange,
  beforeRange: DateRange,
): Promise<TicketTypeChangeData[]> {
  // 구매자 수 조회 (이용권 이름별 → 카테고리별 집계)
  const [afterBuyers, beforeBuyers] = await Promise.all([
    prisma.ticketBuyer.findMany({
      where: { branchId, date: { gte: afterRange.start, lte: afterRange.end } },
      select: { ticketName: true, amount: true },
    }),
    prisma.ticketBuyer.findMany({
      where: { branchId, date: { gte: beforeRange.start, lte: beforeRange.end } },
      select: { ticketName: true, amount: true },
    }),
  ])

  const categories = ['당일권', '시간권', '기간권', '고정석']
  const afterByCategory = new Map<string, { revenue: number; buyers: Set<number> }>()
  const beforeByCategory = new Map<string, { revenue: number; buyers: Set<number> }>()

  for (const cat of categories) {
    afterByCategory.set(cat, { revenue: 0, buyers: new Set() })
    beforeByCategory.set(cat, { revenue: 0, buyers: new Set() })
  }

  afterBuyers.forEach((b, idx) => {
    const cat = inferTicketCategory(b.ticketName)
    const entry = afterByCategory.get(cat)!
    entry.revenue += Number(b.amount ?? 0)
    entry.buyers.add(idx)
  })

  beforeBuyers.forEach((b, idx) => {
    const cat = inferTicketCategory(b.ticketName)
    const entry = beforeByCategory.get(cat)!
    entry.revenue += Number(b.amount ?? 0)
    entry.buyers.add(idx)
  })

  return categories.map((ticketType) => {
    const after = afterByCategory.get(ticketType)!
    const before = beforeByCategory.get(ticketType)!
    const revenueBefore = before.revenue
    const revenueAfter = after.revenue
    const buyersBefore = before.buyers.size
    const buyersAfter = after.buyers.size

    return {
      ticketType,
      revenueBefore,
      revenueAfter,
      revenueChange: revenueAfter - revenueBefore,
      revenueChangePercent: revenueBefore > 0
        ? Number(((revenueAfter - revenueBefore) / revenueBefore * 100).toFixed(1))
        : (revenueAfter > 0 ? 100 : 0),
      buyersBefore,
      buyersAfter,
      buyersChange: buyersAfter - buyersBefore,
    }
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const forceCompute = searchParams.get('compute') === 'true'

    const dbOperation = await prisma.operation.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true, openedAt: true } },
          },
        },
      },
    })

    if (!dbOperation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    const operationInfo = {
      id: dbOperation.id,
      name: dbOperation.name,
      implementedAt: dbOperation.implementedAt.toISOString().split('T')[0],
      cost: dbOperation.cost ? Number(dbOperation.cost) : undefined,
      branches: dbOperation.branches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    }

    // compute 파라미터가 없으면 DB에서 저장된 분석 결과만 확인
    if (!forceCompute) {
      const performances = await loadSavedPerformances(id)
      if (performances) {
        const summary = computeSummary(performances)
        const calculatedAt = await getSavedAnalysisDate(id)
        return NextResponse.json({
          operation: operationInfo,
          performances,
          summary,
          fromCache: true,
          calculatedAt,
        })
      }
      return NextResponse.json({ hasAnalysis: false })
    }

    const implementedAt = dbOperation.implementedAt
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // 분석 가능한 기간 결정 (적용일 이후 경과 월수)
    const monthsSince = (now.getFullYear() - implementedAt.getFullYear()) * 12 + (now.getMonth() - implementedAt.getMonth())
    const availablePeriods: (1 | 3 | 6)[] = []
    if (monthsSince >= 1) availablePeriods.push(1)
    if (monthsSince >= 3) availablePeriods.push(3)
    if (monthsSince >= 6) availablePeriods.push(6)

    // 분석에 사용할 주요 기간 (가장 긴 기간)
    const primaryMonths = availablePeriods.length > 0 ? availablePeriods[availablePeriods.length - 1] : 1
    const primaryRange = getPeriodRange(implementedAt, primaryMonths)

    const targetBranchIds = dbOperation.branches.map((b) => b.branchId)

    // 1m/3m/6m 각 기간의 범위
    const ranges = {
      '1m': getPeriodRange(implementedAt, 1),
      '3m': getPeriodRange(implementedAt, 3),
      '6m': getPeriodRange(implementedAt, 6),
    }

    // 데이터 가용성 확인 (YoY 데이터 여부)
    const oldestDatesMap = await db.metrics.getOldestDataDates(targetBranchIds)

    // 지점별 분석 (병렬 처리)
    const performances: OperationPerformanceData[] = []

    const analysisPromises = targetBranchIds.map(async (branchId) => {
      const branch = dbOperation.branches.find((b) => b.branchId === branchId)?.branch
      if (!branch) return null

      const oldestDate = oldestDatesMap.get(branchId) ?? new Date()
      const hasYoyData = oldestDate.getTime() <= new Date(implementedAt.getTime() - 365 * 24 * 60 * 60 * 1000).getTime()
      const comparisonType: ComparisonType = hasYoyData ? 'YOY' : 'MOM'

      // === 기간별 매출 계산 ===
      interface PeriodResult {
        before: number; after: number; growth: number
        useForecast?: boolean
        forecast?: Awaited<ReturnType<typeof forecastRevenue>>
      }
      const periodResults: Record<string, PeriodResult> = {}

      for (const period of availablePeriods) {
        const key = `${period}m`
        const afterRange = ranges[key as keyof typeof ranges]
        let beforeRange: DateRange

        if (comparisonType === 'YOY') {
          beforeRange = getYoyRange(afterRange)
        } else {
          // MoM: 같은 기간만큼 이전 기간
          beforeRange = {
            start: new Date(afterRange.start),
            end: new Date(afterRange.end),
          }
          beforeRange.start.setMonth(beforeRange.start.getMonth() - period)
          beforeRange.end.setMonth(beforeRange.end.getMonth() - period)
        }

        const [afterMetrics, beforeMetrics] = await Promise.all([
          db.metrics.getMetricsSummary(branchId, afterRange),
          db.metrics.getMetricsSummary(branchId, beforeRange),
        ])

        const revenueAfter = afterMetrics.totalRevenue
        let revenueBefore = beforeMetrics.totalRevenue

        let growth = 0
        let usedForecast = false
        let forecastObj: Awaited<ReturnType<typeof forecastRevenue>> | undefined

        if (revenueBefore > 0) {
          growth = calculateGrowthRate(revenueBefore, revenueAfter)
        } else {
          // 비교 데이터 없으면 forecast 사용
          // 해당 기간의 외부 요인 타입 조회 (이벤트와 동일한 로직)
          const overlappingFactors = await prisma.externalFactor.findMany({
            where: {
              OR: [
                { startDate: { gte: afterRange.start, lte: afterRange.end } },
                { endDate: { gte: afterRange.start, lte: afterRange.end } },
                { AND: [{ startDate: { lte: afterRange.start } }, { endDate: { gte: afterRange.end } }] },
              ],
              branches: { some: { branchId } },
            },
            select: { type: true },
          })
          const factorTypes = overlappingFactors.map((f) => f.type)

          const forecast = await forecastRevenue(branchId, afterRange.start, afterRange.end, factorTypes)
          if (forecast.expectedRevenue > 0) {
            const vs = calculatePerformanceVsForecast(revenueAfter, forecast)
            growth = vs.vsExpected
            revenueBefore = forecast.expectedRevenue
            usedForecast = true
            forecastObj = forecast
          }
        }

        periodResults[key] = { before: revenueBefore, after: revenueAfter, growth, useForecast: usedForecast, forecast: forecastObj }
      }

      // === 주요 기간 기반 상세 분석 ===
      const primaryKey = `${primaryMonths}m`
      const primaryAfterRange = ranges[primaryKey as keyof typeof ranges]
      let primaryBeforeRange: DateRange

      if (comparisonType === 'YOY') {
        primaryBeforeRange = getYoyRange(primaryAfterRange)
      } else {
        primaryBeforeRange = {
          start: new Date(primaryAfterRange.start),
          end: new Date(primaryAfterRange.end),
        }
        primaryBeforeRange.start.setMonth(primaryBeforeRange.start.getMonth() - primaryMonths)
        primaryBeforeRange.end.setMonth(primaryBeforeRange.end.getMonth() - primaryMonths)
      }

      // forecast로 대체된 값이 아닌, 실제 비교 데이터 존재 여부 확인
      const primaryPeriod = periodResults[primaryKey]
      const hasComparisonData = primaryPeriod ? !primaryPeriod.useForecast : false

      // 병렬 데이터 조회
      const [
        afterDailyRevenues,
        beforeDailyRevenues,
        afterVisits,
        beforeVisits,
        eventVisitors,
        segmentResult,
        ticketUpgrades,
        ticketTypeChanges,
        visitPattern,
      ] = await Promise.all([
        db.metrics.getDailyRevenues(branchId, primaryAfterRange),
        db.metrics.getDailyRevenues(branchId, primaryBeforeRange),
        db.visitors.getVisitCount(branchId, primaryAfterRange),
        db.visitors.getVisitCount(branchId, primaryBeforeRange),
        db.visitors.getUniqueVisitors(branchId, primaryAfterRange),
        trackSegmentChangesWithComparison(branchId, primaryAfterRange.start, primaryAfterRange.end, comparisonType),
        trackTicketUpgrades(branchId, primaryAfterRange.start, primaryAfterRange.end),
        calculateTicketTypeChanges(branchId, primaryAfterRange, primaryBeforeRange),
        calculateVisitPattern(branchId, primaryAfterRange, primaryBeforeRange, hasComparisonData),
      ])

      // 고객 통계
      const phones = eventVisitors.map((v) => v.phone)
      const thirtyDaysBefore = new Date(implementedAt)
      thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30)

      const [newCustomers, returnedCustomerIds] = await Promise.all([
        db.customers.countNewCustomers(phones, primaryAfterRange),
        db.customers.getReturnedCustomers(phones, thirtyDaysBefore),
      ])
      const returnedCustomers = returnedCustomerIds.length

      // 고객 성장률 (방문자 수 기반)
      const visitsGrowth = beforeVisits === 0
        ? (afterVisits > 0 ? 100 : 0)
        : calculateGrowthRate(beforeVisits, afterVisits)

      // 일 평균 고객 수
      const afterDays = Math.ceil((primaryAfterRange.end.getTime() - primaryAfterRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const beforeDays = Math.ceil((primaryBeforeRange.end.getTime() - primaryBeforeRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const avgCustomersAfter = Math.round(afterVisits / afterDays)
      const avgCustomersBefore = Math.round(beforeVisits / beforeDays)
      const customerGrowth = avgCustomersBefore > 0
        ? calculateGrowthRate(avgCustomersBefore, avgCustomersAfter)
        : (avgCustomersAfter > 0 ? 100 : 0)

      // 통계 분석
      const stats = afterDailyRevenues.length > 1 && beforeDailyRevenues.length > 1
        ? tTest(beforeDailyRevenues, afterDailyRevenues)
        : { isSignificant: false, pValue: 1, tStatistic: 0 }
      const effect = afterDailyRevenues.length > 1 && beforeDailyRevenues.length > 1
        ? cohensD(beforeDailyRevenues, afterDailyRevenues)
        : { d: 0, interpretation: 'NONE' as const }

      // 세그먼트 데이터 (full comparison 유지 - 이벤트와 동일)
      const { segmentChanges, segmentMigrations, hasComparisonData: hasSegmentComparisonData, periodInfo: segmentPeriodInfo } = segmentResult

      // 점수 계산
      const primaryGrowth = periodResults[primaryKey]?.growth ?? 0
      const { score: performanceScore, breakdown: scoreBreakdown } = calculateScoreWithBreakdown(
        primaryGrowth,
        visitsGrowth,
        stats.isSignificant,
        effect.interpretation,
        newCustomers,
        returnedCustomers,
        segmentMigrations,
        ticketUpgrades,
      )
      const verdict = determineVerdict(performanceScore)

      // 이용권별 개별 매출 추출
      const ticketRevenueMap: Record<string, { after: number; before: number }> = {}
      for (const tc of ticketTypeChanges) {
        ticketRevenueMap[tc.ticketType] = { after: tc.revenueAfter, before: tc.revenueBefore }
      }

      // forecast 데이터 (primary 기간 기준)
      const primaryPeriodResult = periodResults[primaryKey]
      const useForecast = primaryPeriodResult?.useForecast ?? false
      const forecastData = primaryPeriodResult?.forecast

      // 신규 지점 여부
      const isNewBranch = branch.openedAt
        ? branch.openedAt.getTime() > implementedAt.getTime() - 365 * 24 * 60 * 60 * 1000
        : false
      const noYoyDataReason = isNewBranch ? '오픈 1년 미만 지점' : (!hasYoyData ? '전년 데이터 없음' : undefined)

      // 인사이트 생성
      const insights: string[] = []
      const growth3m = periodResults['3m']?.growth
      if (growth3m !== undefined) {
        if (growth3m > 10) insights.push('3개월 매출이 유의미하게 증가했습니다.')
        else if (growth3m < -5) insights.push('3개월 매출이 감소했습니다. 원인 분석이 필요합니다.')
      }
      if (customerGrowth > 5) insights.push('고객 수가 증가하여 운영 변경의 긍정적 효과가 확인됩니다.')
      if (returnedCustomers > 10) insights.push(`${returnedCustomers}명의 휴면 고객이 복귀했습니다.`)
      if (stats.isSignificant) insights.push('변화가 통계적으로 유의미합니다 (p < 0.05).')

      const perfData: OperationPerformanceData = {
        id: `perf-${id}-${branchId}`,
        operationId: id,
        branchId,
        branchName: branch.name,
        calculatedAt: new Date().toISOString(),
        comparisonType,

        revenueBefore1m: periodResults['1m']?.before,
        revenueAfter1m: periodResults['1m']?.after,
        revenueGrowth1m: periodResults['1m']?.growth != null ? Math.round(periodResults['1m'].growth * 100) / 100 : undefined,

        revenueBefore3m: periodResults['3m']?.before ?? 0,
        revenueAfter3m: periodResults['3m']?.after ?? 0,
        revenueGrowth3m: periodResults['3m']?.growth != null ? Math.round(periodResults['3m'].growth * 100) / 100 : 0,

        revenueBefore6m: periodResults['6m']?.before,
        revenueAfter6m: periodResults['6m']?.after,
        revenueGrowth6m: periodResults['6m']?.growth != null ? Math.round(periodResults['6m'].growth * 100) / 100 : undefined,

        avgCustomersBefore,
        avgCustomersAfter,
        customerGrowth: Math.round(customerGrowth * 100) / 100,

        // 방문
        visitsBefore: beforeVisits,
        visitsAfter: afterVisits,
        visitsGrowth: Math.round(visitsGrowth * 100) / 100,

        segmentChanges,
        segmentMigrations,
        hasSegmentComparisonData,
        segmentPeriodInfo,
        ticketTypeChanges,
        ticketUpgrades,
        visitPattern,

        newCustomers,
        returnedCustomers,

        // 이용권별 매출
        dayTicketRevenue: ticketRevenueMap['당일권']?.after,
        dayTicketRevenueBefore: ticketRevenueMap['당일권']?.before,
        timeTicketRevenue: ticketRevenueMap['시간권']?.after,
        timeTicketRevenueBefore: ticketRevenueMap['시간권']?.before,
        termTicketRevenue: ticketRevenueMap['기간권']?.after,
        termTicketRevenueBefore: ticketRevenueMap['기간권']?.before,
        fixedTicketRevenue: ticketRevenueMap['고정석']?.after,
        fixedTicketRevenueBefore: ticketRevenueMap['고정석']?.before,

        // 기대 매출 예측
        forecast: useForecast && forecastData ? {
          expectedRevenue: forecastData.expectedRevenue,
          baseRevenue: forecastData.baseRevenue,
          seasonIndex: forecastData.seasonIndex,
          externalFactorIndex: forecastData.externalFactorIndex,
          trendCoefficient: forecastData.trendCoefficient,
          confidence: forecastData.confidence,
          breakdown: forecastData.breakdown,
        } : undefined,
        useForecast: useForecast || undefined,
        isNewBranch: isNewBranch || undefined,
        noYoyDataReason,

        isSignificant: stats.isSignificant,
        pValue: stats.pValue,
        effectSize: effect.d,

        scoreBreakdown,
        performanceScore: Math.round(performanceScore),
        verdict,
        insights,
      }

      // DB에 분석 결과 저장 (upsert)
      await savePerformanceToDB(id, branchId, perfData)

      return perfData
    })

    const results = await Promise.all(analysisPromises)
    for (const result of results) {
      if (result) performances.push(result)
    }

    const summary = computeSummary(performances)

    return NextResponse.json({
      operation: operationInfo,
      performances,
      summary,
      fromCache: false,
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching operation analysis:', error)
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }
}
