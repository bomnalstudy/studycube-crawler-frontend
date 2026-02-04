import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { tTest, cohensD, calculateGrowthRate } from '@/lib/strategy/statistics'
import { forecastRevenue, forecastRevenueByTicketType, calculatePerformanceVsForecast, type ForecastResult, type TicketTypeForecast } from '@/lib/strategy/forecast'
import { trackSegmentChanges, trackSegmentChangesWithComparison, trackTicketUpgrades, predictEventImpactWithExternalFactors } from '@/lib/strategy/segment-tracker'
import { db, type DateRange } from '@/lib/db'
import { getAnalysisEndDate } from '@/lib/strategy/analysis-helpers'
import { calculateVisitPattern, calculateScoreWithBreakdown, determineVerdict } from '@/lib/strategy/analysis-utils'
import type {
  AnalysisRequest,
  EventPerformanceData,
  ComparisonType,
  VerdictType,
  ExternalFactorListItem,
  ExternalFactorType,
  ImpactEstimate,
  SegmentChangeData,
  SegmentMigration,
  SegmentChangeComparison,
  SegmentMigrationComparison,
  TicketUpgradeData,
  VisitPatternData,
  ScoreBreakdown,
  ExternalFactorImpactPrediction,
} from '@/types/strategy'

// POST: 이벤트 성과 분석
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body: AnalysisRequest = await request.json()

    if (!body.eventId) {
      return NextResponse.json({ success: false, error: 'eventId is required' }, { status: 400 })
    }

    // 이벤트 조회
    const event = await prisma.event.findUnique({
      where: { id: body.eventId },
      include: {
        types: true,
        branches: {
          include: {
            branch: { select: { id: true, name: true, openedAt: true } },
          },
        },
        targets: true,
        author: { select: { id: true, name: true } },
      },
    })

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 })
    }

    // 분석 대상 지점 결정
    const targetBranchIds = body.branchIds?.length
      ? body.branchIds
      : event.branches.map((b) => b.branchId)

    // 이벤트 기간
    const eventStart = event.startDate
    const eventEnd = event.endDate

    // 분석 기간 계산 (최소 30일 보장)
    const startStr = eventStart.toISOString().split('T')[0]
    const endStr = eventEnd.toISOString().split('T')[0]
    const analysisEnd = getAnalysisEndDate(startStr, endStr)

    // 데이터 가용성 확인 및 성과 분석
    const performances: EventPerformanceData[] = []
    const dataAvailability: {
      branchId: string
      branchName: string
      hasYoyData: boolean
      oldestDataDate: string
    }[] = []

    // === 공통 데이터 배치 조회 (최적화) ===
    // 분석 기간: eventStart ~ analysisEnd (최소 30일)
    const eventRange: DateRange = { start: eventStart, end: analysisEnd }

    // YoY 비교 기간 (동일 기간)
    const yoyComparisonRange: DateRange = {
      start: new Date(eventStart.getFullYear() - 1, eventStart.getMonth(), eventStart.getDate()),
      end: new Date(analysisEnd.getFullYear() - 1, analysisEnd.getMonth(), analysisEnd.getDate()),
    }

    // 모든 지점 데이터 일괄 조회
    const [
      oldestDatesMap,
      eventMetricsBatch,
      yoyMetricsBatch,
      eventVisitsBatch,
      yoyVisitsBatch,
    ] = await Promise.all([
      db.metrics.getOldestDataDates(targetBranchIds),
      db.metrics.getMetricsSummaryBatch(targetBranchIds, eventRange),
      db.metrics.getMetricsSummaryBatch(targetBranchIds, yoyComparisonRange),
      db.visitors.getVisitCountBatch(targetBranchIds, eventRange),
      db.visitors.getVisitCountBatch(targetBranchIds, yoyComparisonRange),
    ])

    // 일별 매출 데이터 (통계 분석용)
    const [eventDailyRevenues, yoyDailyRevenues] = await Promise.all([
      db.metrics.getDailyRevenuesBatch(targetBranchIds, eventRange),
      db.metrics.getDailyRevenuesBatch(targetBranchIds, yoyComparisonRange),
    ])

    // === 지점별 분석 (병렬 처리) ===
    const analysisPromises = targetBranchIds.map(async (branchId) => {
      const branch = event.branches.find((b) => b.branchId === branchId)?.branch
      if (!branch) return null

      const oldestDate = oldestDatesMap.get(branchId) ?? new Date()
      const hasYoyData =
        oldestDate.getTime() <=
        new Date(eventStart.getTime() - 365 * 24 * 60 * 60 * 1000).getTime()

      // 비교 유형 결정 (자동 선택)
      const comparisonType: ComparisonType = body.comparisonType ?? (hasYoyData ? 'YOY' : 'MOM')

      // 비교 기간 계산
      let comparisonStart: Date
      let comparisonEnd: Date

      if (comparisonType === 'YOY') {
        comparisonStart = new Date(eventStart)
        comparisonStart.setFullYear(comparisonStart.getFullYear() - 1)
        comparisonEnd = new Date(analysisEnd)
        comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1)
      } else {
        comparisonStart = new Date(eventStart)
        comparisonStart.setMonth(comparisonStart.getMonth() - 1)
        comparisonEnd = new Date(analysisEnd)
        comparisonEnd.setMonth(comparisonEnd.getMonth() - 1)
      }

      const comparisonRange: DateRange = { start: comparisonStart, end: comparisonEnd }

      // 배치에서 이미 조회된 데이터 사용 (YoY인 경우)
      // MoM인 경우만 별도 조회
      let eventMetrics = eventMetricsBatch.get(branchId)!
      let comparisonMetrics
      let eventRevenues = eventDailyRevenues.get(branchId) || []
      let comparisonRevenues: number[]

      if (comparisonType === 'YOY') {
        comparisonMetrics = yoyMetricsBatch.get(branchId)!
        comparisonRevenues = yoyDailyRevenues.get(branchId) || []
      } else {
        // MoM은 별도 조회 필요
        const [momMetrics, momRevenues] = await Promise.all([
          db.metrics.getMetricsSummary(branchId, comparisonRange),
          db.metrics.getDailyRevenues(branchId, comparisonRange),
        ])
        comparisonMetrics = momMetrics
        comparisonRevenues = momRevenues
      }

      // 매출 계산
      const revenueAfter = eventMetrics.totalRevenue
      let revenueBefore = comparisonType === 'YOY'
        ? comparisonMetrics.totalRevenue
        : (comparisonMetrics as any).totalRevenue || 0

      // 비교 데이터 없음 여부 확인
      const hasComparisonData = revenueBefore > 0

      // 신규 지점 여부는 openedAt 기준으로 판단 (6개월 미만)
      let isNewBranch = false
      if (branch.openedAt) {
        const monthsOpen = (new Date().getTime() - branch.openedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
        isNewBranch = monthsOpen < 6
      }

      let noYoyDataReason = ''
      let revenueGrowth = 0
      let forecast: ForecastResult | null = null
      let useForecast = false

      // 전년/전월 데이터가 없으면 예측 시스템 사용
      if (!hasComparisonData) {
        useForecast = true

        // 해당 기간의 외부 요인 타입 조회
        const overlappingFactors = await prisma.externalFactor.findMany({
          where: {
            OR: [
              { startDate: { gte: eventStart, lte: analysisEnd } },
              { endDate: { gte: eventStart, lte: analysisEnd } },
              { AND: [{ startDate: { lte: eventStart } }, { endDate: { gte: analysisEnd } }] },
            ],
            branches: { some: { branchId } },
          },
          select: { type: true },
        })

        const factorTypes = overlappingFactors.map((f) => f.type)

        // 기대 매출 예측
        forecast = await forecastRevenue(branchId, eventStart, analysisEnd, factorTypes)

        if (forecast.expectedRevenue > 0) {
          // 예측 대비 성과 계산
          const vsForcast = calculatePerformanceVsForecast(revenueAfter, forecast)
          revenueGrowth = vsForcast.vsExpected
          revenueBefore = forecast.expectedRevenue // 예측값을 비교 기준으로 사용

          noYoyDataReason = `비교 데이터 없음 - 기대 매출 예측 기반 분석 (신뢰도: ${forecast.confidence})`
        } else {
          noYoyDataReason = comparisonType === 'YOY'
            ? '전년 동기 데이터 없음, 예측 불가'
            : '전월 데이터 없음, 예측 불가'
          revenueGrowth = 0
        }
      } else {
        revenueGrowth = calculateGrowthRate(revenueBefore, revenueAfter)
      }

      // 이용권별 매출 (배치 데이터 사용)
      const dayTicketRevenue = eventMetrics.dayTicketRevenue
      const timeTicketRevenue = eventMetrics.timeTicketRevenue
      const termTicketRevenue = eventMetrics.termTicketRevenue

      // 비교 이용권별 매출 - 비교 데이터 없으면 기대매출 예측 사용
      let dayTicketRevenueBefore = comparisonType === 'YOY'
        ? (comparisonMetrics as any).dayTicketRevenue || 0
        : (comparisonMetrics as any).dayTicketRevenue || 0
      let timeTicketRevenueBefore = comparisonType === 'YOY'
        ? (comparisonMetrics as any).timeTicketRevenue || 0
        : (comparisonMetrics as any).timeTicketRevenue || 0
      let termTicketRevenueBefore = comparisonType === 'YOY'
        ? (comparisonMetrics as any).termTicketRevenue || 0
        : (comparisonMetrics as any).termTicketRevenue || 0
      let fixedTicketRevenueBefore = 0
      let ticketForecastUsed = false

      // 이용권별 비교 데이터가 없으면 기대매출 예측으로 대체
      const hasTicketComparisonData = dayTicketRevenueBefore > 0 || timeTicketRevenueBefore > 0 || termTicketRevenueBefore > 0
      if (!hasTicketComparisonData && (useForecast || !hasComparisonData)) {
        // 전체 기대 매출이 계산되었으면 이용권별로 분배
        const expectedTotal = forecast?.expectedRevenue || revenueBefore
        if (expectedTotal > 0) {
          const ticketForecast = await forecastRevenueByTicketType(branchId, eventStart, analysisEnd, expectedTotal)
          dayTicketRevenueBefore = ticketForecast.dayTicket
          timeTicketRevenueBefore = ticketForecast.timeTicket
          termTicketRevenueBefore = ticketForecast.termTicket
          fixedTicketRevenueBefore = ticketForecast.fixedTicket
          ticketForecastUsed = true
        }
      }

      // 방문 데이터 (배치에서 가져오기, MoM은 별도 조회)
      const eventVisits = eventVisitsBatch.get(branchId) || 0
      let comparisonVisits: number

      if (comparisonType === 'YOY') {
        comparisonVisits = yoyVisitsBatch.get(branchId) || 0
      } else {
        comparisonVisits = await db.visitors.getVisitCount(branchId, comparisonRange)
      }

      const visitsGrowth = comparisonVisits === 0
        ? (eventVisits > 0 ? 100 : 0)
        : calculateGrowthRate(comparisonVisits, eventVisits)

      // 신규/복귀 고객 계산 (db 유틸리티 사용)
      const eventVisitors = await db.visitors.getUniqueVisitors(branchId, eventRange)
      const phones = eventVisitors.map((v) => v.phone)

      const thirtyDaysBeforeEvent = new Date(eventStart)
      thirtyDaysBeforeEvent.setDate(thirtyDaysBeforeEvent.getDate() - 30)

      // 신규 및 복귀 고객 병렬 조회
      const [newCustomers, returnedCustomerIds] = await Promise.all([
        db.customers.countNewCustomers(phones, eventRange),
        db.customers.getReturnedCustomers(phones, thirtyDaysBeforeEvent),
      ])
      const returnedCustomers = returnedCustomerIds.length

      // 해당 지점의 외부요인 타입 조회 (예측용)
      const branchFactors = await prisma.externalFactor.findMany({
        where: {
          OR: [
            { startDate: { gte: eventStart, lte: analysisEnd } },
            { endDate: { gte: eventStart, lte: analysisEnd } },
            { AND: [{ startDate: { lte: eventStart } }, { endDate: { gte: analysisEnd } }] },
          ],
          branches: { some: { branchId } },
        },
        select: { type: true },
      })
      const branchFactorTypes = branchFactors.map((f) => f.type)

      // 세그먼트 및 이용권 변화 + 외부요인 기반 예측 병렬 추적
      const [segmentComparisonResult, ticketUpgrades, externalFactorPredictions] = await Promise.all([
        trackSegmentChangesWithComparison(branchId, eventStart, analysisEnd, comparisonType),
        trackTicketUpgrades(branchId, eventStart, analysisEnd),
        predictEventImpactWithExternalFactors(branchId, branchFactorTypes, eventStart, analysisEnd),
      ])
      const { segmentChanges, segmentMigrations, hasComparisonData: hasSegmentComparisonData, periodInfo: segmentPeriodInfo } = segmentComparisonResult

      // 방문 패턴 (비교 데이터 없으면 최근 3개월 사용)
      const visitPattern = await calculateVisitPattern(branchId, eventRange, comparisonRange, hasComparisonData)

      // 통계 분석
      const stats = eventRevenues.length > 1 && comparisonRevenues.length > 1
        ? tTest(comparisonRevenues, eventRevenues)
        : { isSignificant: false, pValue: 1, tStatistic: 0 }
      const effect = eventRevenues.length > 1 && comparisonRevenues.length > 1
        ? cohensD(comparisonRevenues, eventRevenues)
        : { d: 0, interpretation: 'NONE' as const }

      // 전년 대비 불가 시 유사 지점 대조군 비교 (최적화: 미리 조회된 지점만 사용)
      let controlGroupGrowth: number | undefined
      let controlBranchName: string | undefined

      if (!hasYoyData || isNewBranch) {
        // 첫 번째 유효한 대조군만 찾기 (모든 지점 루프 대신)
        const otherBranches = await prisma.branch.findMany({
          where: { id: { notIn: targetBranchIds } },
          select: { id: true, name: true },
          take: 5, // 최대 5개만 확인
        })

        // 대조군 데이터 배치 조회
        const controlBranchIds = otherBranches.map((b) => b.id)
        const [controlEventMetrics, controlComparisonMetrics] = await Promise.all([
          db.metrics.getMetricsSummaryBatch(controlBranchIds, eventRange),
          db.metrics.getMetricsSummaryBatch(controlBranchIds, comparisonRange),
        ])

        // 첫 번째 유효한 대조군 찾기
        for (const controlBranch of otherBranches) {
          const controlAfterData = controlEventMetrics.get(controlBranch.id)
          const controlBeforeData = controlComparisonMetrics.get(controlBranch.id)

          if (controlAfterData && controlBeforeData && controlBeforeData.totalRevenue > 0) {
            controlGroupGrowth = calculateGrowthRate(
              controlBeforeData.totalRevenue,
              controlAfterData.totalRevenue
            )
            controlBranchName = controlBranch.name
            break // 첫 번째 유효한 대조군 사용
          }
        }
      }

      // 점수 계산 (대조군 성장률 포함)
      const { score: performanceScore, breakdown: scoreBreakdown } = calculateScoreWithBreakdown(
        revenueGrowth,
        visitsGrowth,
        stats.isSignificant,
        effect.interpretation,
        newCustomers,
        returnedCustomers,
        segmentMigrations,
        ticketUpgrades,
        controlGroupGrowth
      )

      // 평가 결정
      const verdict = determineVerdict(performanceScore)

      // 인사이트는 자동 생성하지 않음 (AI 분석 요청 시에만)
      const insights: string[] = []

      // 대조군 비교 정보만 표시
      if (controlGroupGrowth !== undefined && controlBranchName) {
        insights.push(`대조군 (${controlBranchName}): ${controlGroupGrowth.toFixed(1)}% 성장 → 순수 이벤트 효과: ${(revenueGrowth - controlGroupGrowth).toFixed(1)}%p`)
      }

      if (useForecast && forecast) {
        insights.push(`📊 기대 매출 예측 기반 분석 (신뢰도: ${forecast.confidence})`)
        insights.push(`예상 매출: ${forecast.expectedRevenue.toLocaleString()}원 | 실제: ${revenueAfter.toLocaleString()}원`)
        if (forecast.breakdown.baseRevenueReason.includes('유사 지점')) {
          if (isNewBranch) {
            insights.push(`ℹ️ 신규 매장 (오픈 6개월 미만)으로 유사 지점 데이터를 참고했습니다`)
          } else {
            insights.push(`ℹ️ 비교 데이터 부족으로 유사 지점 데이터를 참고했습니다`)
          }
        }
      } else if (!hasComparisonData) {
        insights.push(`⚠️ ${noYoyDataReason}`)
      }

      // 대조군 대비 순수 효과 계산
      const netEventEffect = controlGroupGrowth !== undefined
        ? revenueGrowth - controlGroupGrowth
        : undefined

      const performanceData: EventPerformanceData = {
        id: `${body.eventId}-${branchId}`,
        eventId: body.eventId,
        branchId,
        branchName: branch.name,
        calculatedAt: new Date().toISOString(),
        comparisonType,
        revenueBefore,
        revenueAfter,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        revenueGrowthAdjusted: netEventEffect !== undefined ? Math.round(netEventEffect * 100) / 100 : undefined,
        visitsBefore: comparisonVisits,
        visitsAfter: eventVisits,
        visitsGrowth: Math.round(visitsGrowth * 100) / 100,
        newCustomers,
        returnedCustomers,
        churnedCustomers: 0,
        dayTicketRevenue,
        dayTicketRevenueBefore,
        timeTicketRevenue,
        timeTicketRevenueBefore,
        termTicketRevenue,
        termTicketRevenueBefore,
        segmentChanges,
        segmentMigrations,
        hasSegmentComparisonData,
        segmentPeriodInfo,
        ticketUpgrades,
        visitPattern,
        isNewBranch,
        noYoyDataReason: isNewBranch ? noYoyDataReason : undefined,
        useForecast,
        forecast: forecast ? {
          expectedRevenue: forecast.expectedRevenue,
          baseRevenue: forecast.baseRevenue,
          seasonIndex: forecast.seasonIndex,
          externalFactorIndex: forecast.externalFactorIndex,
          trendCoefficient: forecast.trendCoefficient,
          confidence: forecast.confidence,
          breakdown: forecast.breakdown,
        } : undefined,
        isSignificant: stats.isSignificant,
        pValue: stats.pValue,
        effectSize: effect.d,
        scoreBreakdown,
        externalFactorPredictions: externalFactorPredictions || undefined,
        performanceScore,
        verdict,
        insights,
      }

      // 성과 분석 결과를 DB에 저장 (AI 추천용)
      await prisma.eventPerformance.upsert({
        where: { id: `${body.eventId}-${branchId}` },
        create: {
          id: `${body.eventId}-${branchId}`,
          eventId: body.eventId,
          branchId,
          comparisonType,
          revenueBefore,
          revenueAfter,
          revenueGrowth,
          revenueGrowthAdjusted: netEventEffect,
          newCustomers,
          returnedCustomers,
          churnedCustomers: 0,
          segmentTransitions: segmentMigrations as unknown as Prisma.InputJsonValue,
          visitsBefore: comparisonVisits,
          visitsAfter: eventVisits,
          visitsGrowth,
          dayTicketRevenue,
          timeTicketRevenue,
          termTicketRevenue,
          dayTicketRevenueBefore,
          timeTicketRevenueBefore,
          termTicketRevenueBefore,
          fixedTicketRevenueBefore: fixedTicketRevenueBefore || undefined,
          useForecast,
          forecastData: forecast ? {
            expectedRevenue: forecast.expectedRevenue,
            baseRevenue: forecast.baseRevenue,
            seasonIndex: forecast.seasonIndex,
            externalFactorIndex: forecast.externalFactorIndex,
            trendCoefficient: forecast.trendCoefficient,
            confidence: forecast.confidence,
            breakdown: forecast.breakdown,
          } as unknown as Prisma.InputJsonValue : undefined,
          isNewBranch,
          noYoyDataReason: noYoyDataReason || undefined,
          isSignificant: stats.isSignificant,
          pValue: stats.pValue,
          effectSize: effect.d,
          performanceScore,
          verdict,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          segmentChanges: segmentChanges as unknown as Prisma.InputJsonValue,
          ticketUpgrades: ticketUpgrades as unknown as Prisma.InputJsonValue,
          visitPattern: visitPattern as unknown as Prisma.InputJsonValue,
          externalFactorPredictions: externalFactorPredictions ? externalFactorPredictions as unknown as Prisma.InputJsonValue : undefined,
          insights: insights as unknown as Prisma.InputJsonValue,
        },
        update: {
          comparisonType,
          calculatedAt: new Date(),
          revenueBefore,
          revenueAfter,
          revenueGrowth,
          revenueGrowthAdjusted: netEventEffect,
          newCustomers,
          returnedCustomers,
          churnedCustomers: 0,
          segmentTransitions: segmentMigrations as unknown as Prisma.InputJsonValue,
          visitsBefore: comparisonVisits,
          visitsAfter: eventVisits,
          visitsGrowth,
          dayTicketRevenue,
          timeTicketRevenue,
          termTicketRevenue,
          dayTicketRevenueBefore,
          timeTicketRevenueBefore,
          termTicketRevenueBefore,
          fixedTicketRevenueBefore: fixedTicketRevenueBefore || undefined,
          useForecast,
          forecastData: forecast ? {
            expectedRevenue: forecast.expectedRevenue,
            baseRevenue: forecast.baseRevenue,
            seasonIndex: forecast.seasonIndex,
            externalFactorIndex: forecast.externalFactorIndex,
            trendCoefficient: forecast.trendCoefficient,
            confidence: forecast.confidence,
            breakdown: forecast.breakdown,
          } as unknown as Prisma.InputJsonValue : undefined,
          isNewBranch,
          noYoyDataReason: noYoyDataReason || undefined,
          isSignificant: stats.isSignificant,
          pValue: stats.pValue,
          effectSize: effect.d,
          performanceScore,
          verdict,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          segmentChanges: segmentChanges as unknown as Prisma.InputJsonValue,
          ticketUpgrades: ticketUpgrades as unknown as Prisma.InputJsonValue,
          visitPattern: visitPattern as unknown as Prisma.InputJsonValue,
          externalFactorPredictions: externalFactorPredictions ? externalFactorPredictions as unknown as Prisma.InputJsonValue : undefined,
          insights: insights as unknown as Prisma.InputJsonValue,
        },
      })

      // 결과 반환
      return {
        performanceData,
        dataAvailabilityItem: {
          branchId,
          branchName: branch.name,
          hasYoyData,
          oldestDataDate: oldestDate.toISOString().split('T')[0],
        },
      }
    })

    // 병렬 처리 결과 수집
    const results = await Promise.all(analysisPromises)

    // 결과 분류
    for (const result of results) {
      if (result) {
        performances.push(result.performanceData)
        dataAvailability.push(result.dataAvailabilityItem)
      }
    }

    // 해당 기간 겹치는 외부 요인 조회
    const externalFactors = await prisma.externalFactor.findMany({
      where: {
        OR: [
          { startDate: { gte: eventStart, lte: analysisEnd } },
          { endDate: { gte: eventStart, lte: analysisEnd } },
          { AND: [{ startDate: { lte: eventStart } }, { endDate: { gte: analysisEnd } }] },
        ],
        branches: {
          some: { branchId: { in: targetBranchIds } },
        },
      },
      include: {
        branches: {
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    })

    const externalFactorList: ExternalFactorListItem[] = externalFactors.map((f) => ({
      id: f.id,
      type: f.type as ExternalFactorType,
      name: f.name,
      startDate: f.startDate.toISOString().split('T')[0],
      endDate: f.endDate.toISOString().split('T')[0],
      impactEstimate: f.impactEstimate as ImpactEstimate | undefined,
      isRecurring: f.isRecurring,
      branches: f.branches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    }))

    // 전체 요약 통계
    const summary = {
      avgRevenueGrowth: performances.reduce((sum, p) => sum + p.revenueGrowth, 0) / performances.length,
      avgVisitsGrowth: performances.reduce((sum, p) => sum + p.visitsGrowth, 0) / performances.length,
      avgPerformanceScore: performances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / performances.length,
      totalNewCustomers: performances.reduce((sum, p) => sum + p.newCustomers, 0),
      totalReturnedCustomers: performances.reduce((sum, p) => sum + p.returnedCustomers, 0),
      significantCount: performances.filter((p) => p.isSignificant).length,
      totalBranches: performances.length,
      segmentMigrations: performances.length > 0 ? performances[0].segmentMigrations : [],
      ticketUpgrades: performances.length > 0 ? performances[0].ticketUpgrades : [],
    }

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate.toISOString().split('T')[0],
          endDate: event.endDate.toISOString().split('T')[0],
          analysisEndDate: analysisEnd.toISOString().split('T')[0],
          status: event.status,
          types: event.types.map((t) => ({ type: t.type, subType: t.subType })),
          branches: event.branches.map((b) => ({
            id: b.branch.id,
            name: b.branch.name,
          })),
        },
        performances,
        summary,
        externalFactors: externalFactorList,
        dataAvailability,
        fromCache: false,
        calculatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to analyze event:', error)
    return NextResponse.json({ success: false, error: 'Failed to analyze event' }, { status: 500 })
  }
}
