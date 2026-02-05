/**
 * 이벤트/운영변경 분석에서 공통으로 사용하는 유틸리티 함수들
 *
 * - 방문 패턴 계산 (calculateVisitPattern)
 * - 성과 점수 계산 (calculateScoreWithBreakdown)
 * - 이용권 카테고리 분류 (inferTicketCategory)
 */

import { prisma } from '@/lib/prisma'
import { db, type DateRange } from '@/lib/db'
import type {
  VisitPatternData,
  SegmentMigration,
  SegmentMigrationComparison,
  TicketUpgradeData,
  ScoreBreakdown,
  VerdictType,
} from '@/types/strategy'

/**
 * 방문 패턴 계산 (DB 유틸리티 사용)
 * hasComparisonData가 false면 최근 3개월 데이터를 비교 기간으로 사용
 */
export async function calculateVisitPattern(
  branchId: string,
  eventRange: DateRange,
  comparisonRange: DateRange,
  hasComparisonData: boolean = true
): Promise<VisitPatternData> {
  let actualComparisonRange = comparisonRange
  if (!hasComparisonData) {
    const threeMonthsAgo = new Date(eventRange.start)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const beforeEventStart = new Date(eventRange.start)
    beforeEventStart.setDate(beforeEventStart.getDate() - 1)
    actualComparisonRange = { start: threeMonthsAgo, end: beforeEventStart }
  }

  const [eventVisitors, comparisonVisitors, eventHourly, comparisonHourly, avgUsageTimeAfter, avgUsageTimeBefore] = await Promise.all([
    prisma.dailyVisitor.findMany({
      where: { branchId, visitDate: { gte: eventRange.start, lte: eventRange.end } },
      select: { phone: true },
    }),
    prisma.dailyVisitor.findMany({
      where: { branchId, visitDate: { gte: actualComparisonRange.start, lte: actualComparisonRange.end } },
      select: { phone: true },
    }),
    db.visitors.getHourlyUsage(branchId, eventRange),
    db.visitors.getHourlyUsage(branchId, actualComparisonRange),
    db.visitors.getAverageUsageTime(branchId, eventRange),
    db.visitors.getAverageUsageTime(branchId, actualComparisonRange),
  ])

  const eventCustomerVisits = new Map<string, number>()
  const comparisonCustomerVisits = new Map<string, number>()

  for (const v of eventVisitors) {
    if (v.phone) {
      eventCustomerVisits.set(v.phone, (eventCustomerVisits.get(v.phone) || 0) + 1)
    }
  }
  for (const v of comparisonVisitors) {
    if (v.phone) {
      comparisonCustomerVisits.set(v.phone, (comparisonCustomerVisits.get(v.phone) || 0) + 1)
    }
  }

  const eventDays = Math.ceil((eventRange.end.getTime() - eventRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const comparisonDays = Math.ceil((actualComparisonRange.end.getTime() - actualComparisonRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const avgVisitsAfter = eventCustomerVisits.size > 0
    ? Array.from(eventCustomerVisits.values()).reduce((sum, v) => sum + v, 0) / eventCustomerVisits.size
    : 0
  const rawAvgVisitsBefore = comparisonCustomerVisits.size > 0
    ? Array.from(comparisonCustomerVisits.values()).reduce((sum, v) => sum + v, 0) / comparisonCustomerVisits.size
    : 0
  const avgVisitsBefore = hasComparisonData
    ? rawAvgVisitsBefore
    : rawAvgVisitsBefore * (eventDays / comparisonDays)

  const visitFrequencyChange = avgVisitsBefore > 0
    ? ((avgVisitsAfter - avgVisitsBefore) / avgVisitsBefore) * 100
    : (avgVisitsAfter > 0 ? 100 : 0)

  const usageTimeChange = avgUsageTimeBefore > 0
    ? ((avgUsageTimeAfter - avgUsageTimeBefore) / avgUsageTimeBefore) * 100
    : (avgUsageTimeAfter > 0 ? 100 : 0)

  const peakHourAfter = db.visitors.findPeakHour(eventHourly)
  const peakHourBefore = db.visitors.findPeakHour(comparisonHourly)

  return {
    avgVisitsPerCustomerBefore: Math.round(avgVisitsBefore * 10) / 10,
    avgVisitsPerCustomerAfter: Math.round(avgVisitsAfter * 10) / 10,
    visitFrequencyChange: Math.round(visitFrequencyChange * 10) / 10,
    avgUsageTimeBefore: Math.round(avgUsageTimeBefore),
    avgUsageTimeAfter: Math.round(avgUsageTimeAfter),
    usageTimeChange: Math.round(usageTimeChange * 10) / 10,
    peakHourBefore,
    peakHourAfter,
  }
}

/**
 * 점수 계산 및 상세 내역 생성 (기본 점수 없음, 실제 성과만으로 계산)
 */
export function calculateScoreWithBreakdown(
  revenueGrowth: number,
  visitsGrowth: number,
  isSignificant: boolean,
  effectInterpretation: string,
  newCustomers: number,
  returnedCustomers: number,
  segmentMigrations: SegmentMigration[] | SegmentMigrationComparison[],
  ticketUpgrades: TicketUpgradeData[],
  controlGroupGrowth?: number
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

  // 세그먼트 이동 점수
  const positiveTransitions = segmentMigrations.filter((m) => m.isPositive).reduce((sum, m) => sum + m.count, 0)
  const negativeTransitions = segmentMigrations.filter((m) => !m.isPositive).reduce((sum, m) => sum + m.count, 0)

  let segmentChangeScore = 0
  for (const seg of segmentMigrations) {
    if (['VIP', '단골'].includes(seg.toSegment)) {
      segmentChangeScore += seg.count * 0.5
    }
    if (['이탈위험', '휴면'].includes(seg.toSegment)) {
      segmentChangeScore -= seg.count * 0.5
    }
    if (['이탈위험', '휴면'].includes(seg.fromSegment) && ['일반', '단골', 'VIP'].includes(seg.toSegment)) {
      segmentChangeScore += seg.count * 0.7
    }
  }

  if (segmentChangeScore > 15) {
    segmentScore = 10
    segmentReason = `긍정 이동 ${positiveTransitions}명 (VIP/단골 증가, 이탈 감소)`
  } else if (segmentChangeScore > 8) {
    segmentScore = 7
    segmentReason = `긍정 이동 ${positiveTransitions}명`
  } else if (segmentChangeScore > 3) {
    segmentScore = 4
    segmentReason = `소폭 긍정 이동`
  } else if (segmentChangeScore < -10) {
    segmentScore = -10
    segmentReason = `부정 이동 ${negativeTransitions}명 (이탈위험/휴면 증가)`
  } else if (segmentChangeScore < -5) {
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

  const rawScore = revenueGrowthScore + visitsGrowthScore + statisticalScore + customerScore + segmentScore + ticketUpgradeScore
  const totalScore = Math.max(0, Math.min(100, rawScore))

  return {
    score: totalScore,
    breakdown: {
      baseScore: 0,
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

/** 평가 결정 */
export function determineVerdict(performanceScore: number): VerdictType {
  if (performanceScore >= 70) return 'EXCELLENT'
  if (performanceScore >= 50) return 'GOOD'
  if (performanceScore >= 30) return 'NEUTRAL'
  if (performanceScore >= 10) return 'POOR'
  return 'FAILED'
}

/**
 * 이용권 이름을 카테고리로 분류
 * 당일권, 시간권, 기간권, 고정석
 */
export function inferTicketCategory(ticketName: string): string {
  const lower = ticketName.toLowerCase()

  if (lower.includes('고정')) return '고정석'
  if (lower.includes('기간') || lower.includes('정기') || lower.includes('주간') || lower.includes('월간')) {
    return '기간권'
  }
  if (lower.includes('패키지') || (lower.includes('시간') && !lower.match(/(\d+)\s*시간/))) {
    return '시간권'
  }

  const hourMatch = ticketName.match(/(\d+)\s*시간/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    if (hours <= 12) return '당일권'
  }

  if (lower.includes('당일') || lower.includes('일일')) return '당일권'

  return '시간권'
}
