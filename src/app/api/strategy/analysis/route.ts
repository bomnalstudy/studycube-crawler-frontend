import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'
import { tTest, cohensD, calculateGrowthRate } from '@/lib/strategy/statistics'
import { forecastRevenue, calculatePerformanceVsForecast, type ForecastResult } from '@/lib/strategy/forecast'
import { trackSegmentChanges, trackTicketUpgrades } from '@/lib/strategy/segment-tracker'
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
  TicketUpgradeData,
  VisitPatternData,
  ScoreBreakdown,
} from '@/types/strategy'

// 방문 패턴 계산 (실제 DB 데이터)
async function calculateVisitPattern(
  branchId: string,
  eventStart: Date,
  eventEnd: Date,
  comparisonStart: Date,
  comparisonEnd: Date
): Promise<VisitPatternData> {
  // 이벤트 기간 방문 데이터
  const eventVisitors = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { gte: eventStart, lte: eventEnd },
    },
    select: { customerId: true, visitDate: true },
  })

  // 비교 기간 방문 데이터
  const comparisonVisitors = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { gte: comparisonStart, lte: comparisonEnd },
    },
    select: { customerId: true, visitDate: true },
  })

  // 고객별 방문 수 계산
  const eventCustomerVisits = new Map<string, number>()
  const comparisonCustomerVisits = new Map<string, number>()

  for (const v of eventVisitors) {
    if (v.customerId) {
      eventCustomerVisits.set(v.customerId, (eventCustomerVisits.get(v.customerId) || 0) + 1)
    }
  }

  for (const v of comparisonVisitors) {
    if (v.customerId) {
      comparisonCustomerVisits.set(v.customerId, (comparisonCustomerVisits.get(v.customerId) || 0) + 1)
    }
  }

  // 평균 방문 수 계산
  const avgVisitsAfter = eventCustomerVisits.size > 0
    ? Array.from(eventCustomerVisits.values()).reduce((sum, v) => sum + v, 0) / eventCustomerVisits.size
    : 0
  const avgVisitsBefore = comparisonCustomerVisits.size > 0
    ? Array.from(comparisonCustomerVisits.values()).reduce((sum, v) => sum + v, 0) / comparisonCustomerVisits.size
    : 0

  const visitFrequencyChange = avgVisitsBefore > 0
    ? ((avgVisitsAfter - avgVisitsBefore) / avgVisitsBefore) * 100
    : (avgVisitsAfter > 0 ? 100 : 0)

  // 시간대별 방문 분포 (피크 시간)
  const hourlyUsage = await prisma.hourlyUsage.findMany({
    where: {
      branchId,
      date: { gte: eventStart, lte: eventEnd },
    },
    select: { hour: true, usageCount: true },
  })

  const comparisonHourly = await prisma.hourlyUsage.findMany({
    where: {
      branchId,
      date: { gte: comparisonStart, lte: comparisonEnd },
    },
    select: { hour: true, usageCount: true },
  })

  // 시간대별 합계
  const hourSumAfter: Record<number, number> = {}
  const hourSumBefore: Record<number, number> = {}

  for (const h of hourlyUsage) {
    hourSumAfter[h.hour] = (hourSumAfter[h.hour] || 0) + (h.usageCount || 0)
  }

  for (const h of comparisonHourly) {
    hourSumBefore[h.hour] = (hourSumBefore[h.hour] || 0) + (h.usageCount || 0)
  }

  // 피크 시간 찾기
  const peakHourAfter = Object.entries(hourSumAfter).sort((a, b) => b[1] - a[1])[0]?.[0] || '14'
  const peakHourBefore = Object.entries(hourSumBefore).sort((a, b) => b[1] - a[1])[0]?.[0] || '14'

  // 평균 이용 시간은 데이터가 없으므로 기본값 사용
  const avgUsageTimeBefore = 150 // 분
  const avgUsageTimeAfter = 150

  return {
    avgVisitsPerCustomerBefore: Math.round(avgVisitsBefore * 10) / 10,
    avgVisitsPerCustomerAfter: Math.round(avgVisitsAfter * 10) / 10,
    visitFrequencyChange: Math.round(visitFrequencyChange * 10) / 10,
    avgUsageTimeBefore,
    avgUsageTimeAfter,
    usageTimeChange: 0,
    peakHourBefore: parseInt(peakHourBefore),
    peakHourAfter: parseInt(peakHourAfter),
  }
}

// 점수 계산 및 상세 내역 생성 (기본 점수 없음, 실제 성과만으로 계산)
function calculateScoreWithBreakdown(
  revenueGrowth: number,
  visitsGrowth: number,
  isSignificant: boolean,
  effectInterpretation: string,
  newCustomers: number,
  returnedCustomers: number,
  segmentMigrations: SegmentMigration[],
  ticketUpgrades: TicketUpgradeData[],
  controlGroupGrowth?: number // 대조군 성장률 (있으면 비교)
): { score: number; breakdown: ScoreBreakdown } {
  let revenueGrowthScore = 0
  let revenueGrowthReason = ''
  let visitsGrowthScore = 0
  let visitsGrowthReason = ''
  let statisticalScore = 0
  let statisticalReason = ''
  let customerScore = 0
  let customerReason = ''
  let segmentScore = 0
  let segmentReason = ''
  let ticketUpgradeScore = 0
  let ticketUpgradeReason = ''

  // 대조군 대비 순수 효과 계산 (대조군이 있으면)
  const netGrowth = controlGroupGrowth !== undefined
    ? revenueGrowth - controlGroupGrowth
    : revenueGrowth

  // 매출 성장률 점수 (0~30점)
  if (netGrowth > 20) {
    revenueGrowthScore = 30
    revenueGrowthReason = controlGroupGrowth !== undefined
      ? `순수 효과 ${netGrowth.toFixed(1)}% (대조군 대비, 20% 초과)`
      : `매출 ${revenueGrowth.toFixed(1)}% 성장 (20% 초과)`
  } else if (netGrowth > 10) {
    revenueGrowthScore = 20
    revenueGrowthReason = controlGroupGrowth !== undefined
      ? `순수 효과 ${netGrowth.toFixed(1)}% (대조군 대비, 10~20%)`
      : `매출 ${revenueGrowth.toFixed(1)}% 성장 (10~20%)`
  } else if (netGrowth > 5) {
    revenueGrowthScore = 15
    revenueGrowthReason = controlGroupGrowth !== undefined
      ? `순수 효과 ${netGrowth.toFixed(1)}% (대조군 대비, 5~10%)`
      : `매출 ${revenueGrowth.toFixed(1)}% 성장 (5~10%)`
  } else if (netGrowth > 0) {
    revenueGrowthScore = 10
    revenueGrowthReason = controlGroupGrowth !== undefined
      ? `순수 효과 ${netGrowth.toFixed(1)}% (대조군 대비, 0~5%)`
      : `매출 ${revenueGrowth.toFixed(1)}% 성장 (0~5%)`
  } else if (netGrowth < -10) {
    revenueGrowthScore = -20
    revenueGrowthReason = `매출 ${netGrowth.toFixed(1)}% 감소 (10% 초과 감소)`
  } else if (netGrowth < 0) {
    revenueGrowthScore = -10
    revenueGrowthReason = `매출 ${netGrowth.toFixed(1)}% 감소`
  } else {
    revenueGrowthReason = '매출 변화 없음'
  }

  // 방문 성장률 점수 (0~15점)
  if (visitsGrowth > 15) {
    visitsGrowthScore = 15
    visitsGrowthReason = `방문 ${visitsGrowth.toFixed(1)}% 증가 (15% 초과)`
  } else if (visitsGrowth > 5) {
    visitsGrowthScore = 10
    visitsGrowthReason = `방문 ${visitsGrowth.toFixed(1)}% 증가 (5~15%)`
  } else if (visitsGrowth > 0) {
    visitsGrowthScore = 5
    visitsGrowthReason = `방문 ${visitsGrowth.toFixed(1)}% 증가 (0~5%)`
  } else if (visitsGrowth < -10) {
    visitsGrowthScore = -10
    visitsGrowthReason = `방문 ${visitsGrowth.toFixed(1)}% 감소`
  } else {
    visitsGrowthReason = `방문 ${visitsGrowth.toFixed(1)}% 변화`
  }

  // 통계적 유의성 점수 (0~20점)
  if (isSignificant && netGrowth > 0) {
    statisticalScore = 15
    statisticalReason = '통계적으로 유의미한 긍정적 변화'
  } else if (isSignificant && netGrowth < 0) {
    statisticalScore = -5
    statisticalReason = '통계적으로 유의미한 부정적 변화'
  } else {
    statisticalReason = '통계적 유의성 없음 (자연 변동 범위)'
  }

  // 효과 크기 점수
  if (effectInterpretation === 'LARGE') {
    statisticalScore += 5
    statisticalReason += ' + 효과 크기 큼'
  } else if (effectInterpretation === 'MEDIUM') {
    statisticalScore += 3
    statisticalReason += ' + 효과 크기 중간'
  }

  // 고객 점수
  if (newCustomers > 20) {
    customerScore += 10
    customerReason = `신규 고객 ${newCustomers}명 (20명 초과)`
  } else if (newCustomers > 10) {
    customerScore += 5
    customerReason = `신규 고객 ${newCustomers}명 (10~20명)`
  } else {
    customerReason = `신규 고객 ${newCustomers}명`
  }

  if (returnedCustomers > 10) {
    customerScore += 5
    customerReason += `, 복귀 고객 ${returnedCustomers}명 (10명 초과)`
  } else if (returnedCustomers > 5) {
    customerScore += 3
    customerReason += `, 복귀 고객 ${returnedCustomers}명`
  }

  // 세그먼트 이동 점수 (이동 방향에 따라 평가)
  // 긍정적 이동: 일반→단골, 일반→VIP, 단골→VIP, 이탈위험→일반/단골, 휴면→일반/단골
  // 부정적 이동: 일반→이탈위험, 일반→휴면, 단골→일반/이탈위험, VIP→단골/일반
  const positiveTransitions = segmentMigrations.filter((m) => m.isPositive).reduce((sum, m) => sum + m.count, 0)
  const negativeTransitions = segmentMigrations.filter((m) => !m.isPositive).reduce((sum, m) => sum + m.count, 0)
  const netTransitions = positiveTransitions - negativeTransitions

  // 세그먼트 변화도 평가 (VIP/단골 증가는 좋고, 이탈위험/휴면 증가는 나쁨)
  let segmentChangeScore = 0
  let segmentChangeDetails: string[] = []

  for (const seg of segmentMigrations) {
    // 긍정적 세그먼트(VIP, 단골)로 이동 = 좋음
    if (['VIP', '단골'].includes(seg.toSegment)) {
      segmentChangeScore += seg.count * 0.5
      segmentChangeDetails.push(`${seg.fromSegment}→${seg.toSegment} ${seg.count}명`)
    }
    // 부정적 세그먼트(이탈위험, 휴면)로 이동 = 나쁨
    if (['이탈위험', '휴면'].includes(seg.toSegment)) {
      segmentChangeScore -= seg.count * 0.5
    }
    // 부정적 세그먼트에서 이탈 = 좋음
    if (['이탈위험', '휴면'].includes(seg.fromSegment) && ['일반', '단골', 'VIP'].includes(seg.toSegment)) {
      segmentChangeScore += seg.count * 0.7
    }
  }

  // 최종 세그먼트 점수 (이동 기반 + 변화 기반)
  const combinedSegmentScore = segmentChangeScore

  if (combinedSegmentScore > 15) {
    segmentScore = 10
    segmentReason = `긍정 이동 ${positiveTransitions}명 (VIP/단골 증가, 이탈 감소)`
  } else if (combinedSegmentScore > 8) {
    segmentScore = 7
    segmentReason = `긍정 이동 ${positiveTransitions}명`
  } else if (combinedSegmentScore > 3) {
    segmentScore = 4
    segmentReason = `소폭 긍정 이동`
  } else if (combinedSegmentScore < -10) {
    segmentScore = -10
    segmentReason = `부정 이동 ${negativeTransitions}명 (이탈위험/휴면 증가)`
  } else if (combinedSegmentScore < -5) {
    segmentScore = -5
    segmentReason = `부정 이동 ${negativeTransitions}명`
  } else {
    segmentReason = `세그먼트 변화 미미`
  }

  // 이용권 업그레이드 점수
  const totalUpgrades = ticketUpgrades.reduce((sum, u) => sum + u.count, 0)
  if (totalUpgrades > 30) {
    ticketUpgradeScore = 10
    ticketUpgradeReason = `이용권 업그레이드 ${totalUpgrades}건`
  } else if (totalUpgrades > 15) {
    ticketUpgradeScore = 5
    ticketUpgradeReason = `이용권 업그레이드 ${totalUpgrades}건`
  } else {
    ticketUpgradeReason = `이용권 업그레이드 ${totalUpgrades}건`
  }

  // 총합 계산 (기본 점수 없이, 최대 100점)
  const rawScore = revenueGrowthScore + visitsGrowthScore + statisticalScore + customerScore + segmentScore + ticketUpgradeScore
  const totalScore = Math.max(0, Math.min(100, rawScore))

  return {
    score: totalScore,
    breakdown: {
      baseScore: 0, // 기본 점수 없음
      revenueGrowthScore,
      revenueGrowthReason,
      visitsGrowthScore,
      visitsGrowthReason,
      statisticalScore,
      statisticalReason,
      customerScore,
      customerReason,
      segmentScore,
      segmentReason,
      ticketUpgradeScore,
      ticketUpgradeReason,
      totalScore,
    },
  }
}

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
            branch: { select: { id: true, name: true } },
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

    // 데이터 가용성 확인 및 성과 분석
    const performances: EventPerformanceData[] = []
    const dataAvailability: {
      branchId: string
      branchName: string
      hasYoyData: boolean
      oldestDataDate: string
    }[] = []

    for (const branchId of targetBranchIds) {
      const branch = event.branches.find((b) => b.branchId === branchId)?.branch
      if (!branch) continue

      // 가장 오래된 데이터 날짜 확인
      const oldestMetric = await prisma.dailyMetric.findFirst({
        where: { branchId },
        orderBy: { date: 'asc' },
        select: { date: true },
      })

      const oldestDate = oldestMetric?.date ?? new Date()
      const hasYoyData =
        oldestDate.getTime() <=
        new Date(eventStart.getTime() - 365 * 24 * 60 * 60 * 1000).getTime()

      dataAvailability.push({
        branchId,
        branchName: branch.name,
        hasYoyData,
        oldestDataDate: oldestDate.toISOString().split('T')[0],
      })

      // 비교 유형 결정 (자동 선택)
      const comparisonType: ComparisonType = body.comparisonType ?? (hasYoyData ? 'YOY' : 'MOM')

      // 비교 기간 계산
      let comparisonStart: Date
      let comparisonEnd: Date

      if (comparisonType === 'YOY') {
        comparisonStart = new Date(eventStart)
        comparisonStart.setFullYear(comparisonStart.getFullYear() - 1)
        comparisonEnd = new Date(eventEnd)
        comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1)
      } else {
        comparisonStart = new Date(eventStart)
        comparisonStart.setMonth(comparisonStart.getMonth() - 1)
        comparisonEnd = new Date(eventEnd)
        comparisonEnd.setMonth(comparisonEnd.getMonth() - 1)
      }

      // 이벤트 기간 매출 데이터
      const eventMetrics = await prisma.dailyMetric.findMany({
        where: {
          branchId,
          date: { gte: eventStart, lte: eventEnd },
        },
        orderBy: { date: 'asc' },
      })

      // 비교 기간 매출 데이터
      const comparisonMetrics = await prisma.dailyMetric.findMany({
        where: {
          branchId,
          date: { gte: comparisonStart, lte: comparisonEnd },
        },
        orderBy: { date: 'asc' },
      })

      // 매출 계산
      const eventRevenues = eventMetrics.map((m) => Number(m.totalRevenue ?? 0))
      const comparisonRevenues = comparisonMetrics.map((m) => Number(m.totalRevenue ?? 0))

      const revenueAfter = eventRevenues.reduce((sum, r) => sum + r, 0)
      let revenueBefore = comparisonRevenues.reduce((sum, r) => sum + r, 0)

      // 비교 데이터 없음 여부 확인
      const hasComparisonData = comparisonMetrics.length > 0 && revenueBefore > 0
      let isNewBranch = false
      let noYoyDataReason = ''
      let revenueGrowth = 0
      let forecast: ForecastResult | null = null
      let useForecast = false

      // 전년/전월 데이터가 없으면 예측 시스템 사용
      if (!hasComparisonData) {
        isNewBranch = true
        useForecast = true

        // 해당 기간의 외부 요인 타입 조회
        const overlappingFactors = await prisma.externalFactor.findMany({
          where: {
            OR: [
              { startDate: { gte: eventStart, lte: eventEnd } },
              { endDate: { gte: eventStart, lte: eventEnd } },
              { AND: [{ startDate: { lte: eventStart } }, { endDate: { gte: eventEnd } }] },
            ],
            branches: { some: { branchId } },
          },
          select: { type: true },
        })

        const factorTypes = overlappingFactors.map((f) => f.type)

        // 기대 매출 예측
        forecast = await forecastRevenue(branchId, eventStart, eventEnd, factorTypes)

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

      // 이용권별 매출 (전후 비교)
      const dayTicketRevenue = eventMetrics.reduce((sum, m) => sum + Number(m.dayTicketRevenue ?? 0), 0)
      const dayTicketRevenueBefore = comparisonMetrics.reduce((sum, m) => sum + Number(m.dayTicketRevenue ?? 0), 0)
      const timeTicketRevenue = eventMetrics.reduce((sum, m) => sum + Number(m.timeTicketRevenue ?? 0), 0)
      const timeTicketRevenueBefore = comparisonMetrics.reduce((sum, m) => sum + Number(m.timeTicketRevenue ?? 0), 0)
      const termTicketRevenue = eventMetrics.reduce((sum, m) => sum + Number(m.termTicketRevenue ?? 0), 0)
      const termTicketRevenueBefore = comparisonMetrics.reduce((sum, m) => sum + Number(m.termTicketRevenue ?? 0), 0)

      // 방문 데이터
      const eventVisits = await prisma.dailyVisitor.count({
        where: {
          branchId,
          visitDate: { gte: eventStart, lte: eventEnd },
        },
      })

      const comparisonVisits = await prisma.dailyVisitor.count({
        where: {
          branchId,
          visitDate: { gte: comparisonStart, lte: comparisonEnd },
        },
      })

      const visitsGrowth = comparisonVisits === 0
        ? (eventVisits > 0 ? 100 : 0)
        : calculateGrowthRate(comparisonVisits, eventVisits)

      // 신규/복귀 고객 계산
      const eventVisitors = await prisma.dailyVisitor.findMany({
        where: {
          branchId,
          visitDate: { gte: eventStart, lte: eventEnd },
        },
        select: { phone: true, customerId: true },
        distinct: ['phone'],
      })

      const newCustomers = await prisma.customer.count({
        where: {
          phone: { in: eventVisitors.map((v) => v.phone) },
          firstVisitDate: { gte: eventStart, lte: eventEnd },
        },
      })

      const thirtyDaysBeforeEvent = new Date(eventStart)
      thirtyDaysBeforeEvent.setDate(thirtyDaysBeforeEvent.getDate() - 30)

      const potentialReturned = await prisma.customer.findMany({
        where: {
          phone: { in: eventVisitors.map((v) => v.phone) },
          lastVisitDate: { lt: thirtyDaysBeforeEvent },
        },
        select: { id: true },
      })

      const returnedCustomers = potentialReturned.length

      // 세그먼트 변화 및 이용권 업그레이드 추적 (실제 DB 데이터)
      const { segmentChanges, segmentMigrations } = await trackSegmentChanges(
        branchId,
        eventStart,
        eventEnd
      )
      const ticketUpgrades = await trackTicketUpgrades(branchId, eventStart, eventEnd)

      // 방문 패턴 (실제 데이터 계산)
      const visitPattern = await calculateVisitPattern(branchId, eventStart, eventEnd, comparisonStart, comparisonEnd)

      // 통계 분석
      const stats = eventRevenues.length > 1 && comparisonRevenues.length > 1
        ? tTest(comparisonRevenues, eventRevenues)
        : { isSignificant: false, pValue: 1, tStatistic: 0 }
      const effect = eventRevenues.length > 1 && comparisonRevenues.length > 1
        ? cohensD(comparisonRevenues, eventRevenues)
        : { d: 0, interpretation: 'NONE' as const }

      // 전년 대비 불가 시 유사 지점 대조군 비교
      let controlGroupGrowth: number | undefined
      let controlBranchName: string | undefined

      if (!hasYoyData || isNewBranch) {
        // 같은 기간 동안 이벤트 미적용 지점 중 유사한 지점 찾기
        const otherBranches = await prisma.branch.findMany({
          where: {
            id: { notIn: targetBranchIds }, // 이벤트 적용 지점 제외
          },
          select: { id: true, name: true },
        })

        // 대조군 매출 데이터 조회
        for (const controlBranch of otherBranches) {
          const controlMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: controlBranch.id,
              date: { gte: eventStart, lte: eventEnd },
            },
          })

          const controlPrevMetrics = await prisma.dailyMetric.findMany({
            where: {
              branchId: controlBranch.id,
              date: { gte: comparisonStart, lte: comparisonEnd },
            },
          })

          if (controlMetrics.length > 0 && controlPrevMetrics.length > 0) {
            const controlAfter = controlMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0)
            const controlBefore = controlPrevMetrics.reduce((sum, m) => sum + Number(m.totalRevenue ?? 0), 0)

            if (controlBefore > 0) {
              controlGroupGrowth = calculateGrowthRate(controlBefore, controlAfter)
              controlBranchName = controlBranch.name
              break // 첫 번째 유효한 대조군 사용
            }
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
      let verdict: VerdictType
      if (performanceScore >= 70) verdict = 'EXCELLENT'
      else if (performanceScore >= 50) verdict = 'GOOD'
      else if (performanceScore >= 30) verdict = 'NEUTRAL'
      else if (performanceScore >= 10) verdict = 'POOR'
      else verdict = 'FAILED'

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
          insights.push(`ℹ️ 신규 매장으로 유사 지점 데이터를 참고했습니다`)
        }
      } else if (isNewBranch) {
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
        performanceScore,
        verdict,
        insights,
      }

      performances.push(performanceData)

      // 성과 분석 결과를 DB에 저장 (AI 추천용)
      await prisma.eventPerformance.upsert({
        where: {
          // eventId + branchId 조합으로 유니크하게 저장
          // 기존 분석이 있으면 업데이트, 없으면 생성
          id: `${body.eventId}-${branchId}`,
        },
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
          isSignificant: stats.isSignificant,
          pValue: stats.pValue,
          effectSize: effect.d,
          performanceScore,
          verdict,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          segmentChanges: segmentChanges as unknown as Prisma.InputJsonValue,
          ticketUpgrades: ticketUpgrades as unknown as Prisma.InputJsonValue,
          visitPattern: visitPattern as unknown as Prisma.InputJsonValue,
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
          isSignificant: stats.isSignificant,
          pValue: stats.pValue,
          effectSize: effect.d,
          performanceScore,
          verdict,
          scoreBreakdown: scoreBreakdown as unknown as Prisma.InputJsonValue,
          segmentChanges: segmentChanges as unknown as Prisma.InputJsonValue,
          ticketUpgrades: ticketUpgrades as unknown as Prisma.InputJsonValue,
          visitPattern: visitPattern as unknown as Prisma.InputJsonValue,
          insights: insights as unknown as Prisma.InputJsonValue,
        },
      })
    }

    // 해당 기간 겹치는 외부 요인 조회
    const externalFactors = await prisma.externalFactor.findMany({
      where: {
        OR: [
          { startDate: { gte: eventStart, lte: eventEnd } },
          { endDate: { gte: eventStart, lte: eventEnd } },
          { AND: [{ startDate: { lte: eventStart } }, { endDate: { gte: eventEnd } }] },
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
      },
    })
  } catch (error) {
    console.error('Failed to analyze event:', error)
    return NextResponse.json({ success: false, error: 'Failed to analyze event' }, { status: 500 })
  }
}
