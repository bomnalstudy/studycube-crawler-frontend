import { prisma } from '@/lib/prisma'
import { calculateVisitSegment } from '@/lib/crm/segment-calculator'
import { db, type DateRange } from '@/lib/db'
import type {
  SegmentChangeData,
  SegmentMigration,
  SegmentChangePrediction,
  TicketUpgradePrediction,
  ExternalFactorImpactPrediction,
  SegmentChangeComparison,
  SegmentMigrationComparison,
  ComparisonType,
} from '@/types/strategy'

// 세그먼트 코드 → 표시 이름 매핑
const SEGMENT_NAMES: Record<string, string> = {
  visit_over20: 'VIP',
  visit_10_20: '단골',
  visit_under10: '일반',
  at_risk_14: '이탈위험',
  churned: '이탈',
  new_0_7: '신규',
  returned: '복귀',
}

// 세그먼트 표시 순서 (사용자 요청 순서)
const SEGMENT_ORDER = ['단골', 'VIP', '일반', '신규', '이탈위험', '이탈', '복귀']

// 부정적 세그먼트 (감소가 긍정적인 것들)
const NEGATIVE_SEGMENTS = ['이탈위험', '이탈']

// 세그먼트 계층 순위 (VIP > 단골 > 일반)
// 숫자가 높을수록 좋은 세그먼트
const SEGMENT_HIERARCHY: Record<string, number> = {
  'VIP': 3,
  '단골': 2,
  '일반': 1,
  '신규': 0,
  '복귀': 0,
  '이탈위험': -1,
  '이탈': -2,
}

// 유효한 세그먼트 이동 규칙
// 복귀는 오직 이탈/이탈위험에서만 가능
const VALID_TRANSITIONS: Record<string, string[]> = {
  '신규': ['일반', '단골', 'VIP', '이탈위험', '이탈'],
  '일반': ['단골', 'VIP', '이탈위험', '이탈'],
  '단골': ['VIP', '일반', '이탈위험', '이탈'],
  'VIP': ['단골', '일반', '이탈위험', '이탈'],
  '이탈위험': ['일반', '단골', 'VIP', '이탈', '복귀'],
  '이탈': ['일반', '단골', 'VIP', '복귀'],
  '복귀': ['일반', '단골', 'VIP', '이탈위험', '이탈'],
}

/**
 * 고객 세그먼트 일괄 계산 (배치 처리)
 */
function calculateSegmentFromData(
  customerId: string,
  customerData: {
    firstVisitDate: Date
    lastVisitDate: Date | null
  } | null,
  recentVisitCount: number,
  previousVisitDate: Date | null,
  hasFixedSeat: boolean,
  referenceDate: Date,
  rangeStart: Date
): string {
  if (!customerData) return '일반'

  const segment = calculateVisitSegment({
    lastVisitDate: customerData.lastVisitDate,
    firstVisitDate: customerData.firstVisitDate,
    recentVisits: recentVisitCount,
    referenceDate,
    rangeStart,
    previousLastVisitDate: previousVisitDate,
    hasRemainingFixedSeat: hasFixedSeat,
    hasRemainingTermTicket: false,
  })

  return SEGMENT_NAMES[segment] || '일반'
}

/**
 * 이벤트 기간의 세그먼트 현황 계산 (CRM과 동일한 로직)
 *
 * CRM과 100% 동일한 방식으로 계산:
 * - 이벤트 기간 내 방문 수 기준으로 VIP/단골/일반 판정
 * - 이벤트 종료일 기준으로 이탈/이탈위험 판정
 *
 * 반환값의 "countBefore"는 사용하지 않고, "countAfter"가 실제 값임
 * (기존 API 호환성을 위해 구조 유지)
 */
export async function trackSegmentChanges(
  branchId: string,
  eventStart: Date,
  eventEnd: Date
): Promise<{
  segmentChanges: SegmentChangeData[]
  segmentMigrations: SegmentMigration[]
}> {
  // 이벤트 기간을 그대로 사용 (CRM과 동일)
  const rangeStart = new Date(eventStart)
  const rangeEnd = new Date(eventEnd)

  console.log('[세그먼트 추적] CRM 동일 로직 - 이벤트 기간:', {
    rangeStart: rangeStart.toISOString().split('T')[0],
    rangeEnd: rangeEnd.toISOString().split('T')[0],
  })

  // === CRM과 동일한 방식으로 세그먼트 계산 ===

  // 1. 이 지점을 방문한 적 있는 모든 고객 조회 (rangeEnd 이전)
  const allBranchCustomers = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { lte: rangeEnd },
    },
    select: { customerId: true },
    distinct: ['customerId'],
  })

  const customerIds = allBranchCustomers
    .map((v) => v.customerId)
    .filter((id): id is string => id !== null)

  if (customerIds.length === 0) {
    return {
      segmentChanges: SEGMENT_ORDER.map((name) => ({
        segmentName: name,
        countBefore: 0,
        countAfter: 0,
        change: 0,
        changePercent: 0,
        isNegativeSegment: NEGATIVE_SEGMENTS.includes(name),
      })),
      segmentMigrations: [],
    }
  }

  // 2. 고객 정보 일괄 조회
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      firstVisitDate: true,
      lastVisitDate: true,
    },
  })
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  // 3. 이벤트 기간 내 방문 수 (CRM과 동일)
  const periodVisitCounts = await prisma.dailyVisitor.groupBy({
    by: ['customerId'],
    where: {
      branchId,
      customerId: { in: customerIds },
      visitDate: { gte: rangeStart, lte: rangeEnd },
    },
    _count: { customerId: true },
  })
  const periodVisitMap = new Map(
    periodVisitCounts.map((v) => [v.customerId!, v._count.customerId])
  )

  // 4. 이벤트 기간 이전 마지막 방문일 (복귀 판단용)
  const allVisits = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      visitDate: { lt: rangeStart },
    },
    select: { customerId: true, visitDate: true },
    orderBy: { visitDate: 'desc' },
  })

  const previousVisitMap = new Map<string, Date>()
  for (const v of allVisits) {
    if (v.customerId && !previousVisitMap.has(v.customerId)) {
      previousVisitMap.set(v.customerId, v.visitDate)
    }
  }

  // 5. 고정석 보유 여부 (배치 조회)
  const fixedSeatPurchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      ticketName: { contains: '고정' },
    },
    select: { customerId: true },
    distinct: ['customerId'],
  })
  const hasFixedSeatSet = new Set(fixedSeatPurchases.map((p) => p.customerId))

  // === 세그먼트 계산 (CRM과 동일 로직) ===
  const segmentCounts: Record<string, number> = {}
  for (const segment of SEGMENT_ORDER) {
    segmentCounts[segment] = 0
  }

  for (const customerId of customerIds) {
    const customerData = customerMap.get(customerId)
    if (!customerData) continue

    const recentVisits = periodVisitMap.get(customerId) || 0
    const previousLastVisit = previousVisitMap.get(customerId) || null

    // CRM과 동일한 세그먼트 계산
    const segment = calculateSegmentFromData(
      customerId,
      {
        firstVisitDate: customerData.firstVisitDate,
        lastVisitDate: customerData.lastVisitDate,
      },
      recentVisits,
      previousLastVisit,
      hasFixedSeatSet.has(customerId),
      rangeEnd,    // referenceDate = 이벤트 종료일
      rangeStart   // rangeStart = 이벤트 시작일 (신규 판정용)
    )

    segmentCounts[segment] = (segmentCounts[segment] || 0) + 1
  }

  // countBefore는 0으로 설정 (비교는 trackSegmentChangesWithComparison에서 처리)
  // countAfter가 실제 값
  const segmentChanges: SegmentChangeData[] = SEGMENT_ORDER.map((segmentName) => {
    const count = segmentCounts[segmentName] || 0
    return {
      segmentName,
      countBefore: 0,      // 실제/예상 비교용 - 비교 함수에서 처리
      countAfter: count,   // 실제 세그먼트 수 (CRM과 동일)
      change: count,
      changePercent: 0,
      isNegativeSegment: NEGATIVE_SEGMENTS.includes(segmentName),
    }
  })

  // 세그먼트 이동은 이 함수에서는 계산하지 않음 (단일 기간이므로)
  const segmentMigrations: SegmentMigration[] = []

  console.log('[세그먼트 추적] 결과:', {
    totalCustomers: customerIds.length,
    segments: Object.fromEntries(
      SEGMENT_ORDER.map(s => [s, segmentCounts[s] || 0])
    ),
  })

  return { segmentChanges, segmentMigrations }
}

/**
 * 이용권 업그레이드 추적 (최적화 버전)
 */
export async function trackTicketUpgrades(
  branchId: string,
  eventStart: Date,
  eventEnd: Date
): Promise<{
  fromTicket: string
  toTicket: string
  count: number
  upgradeRate: number
}[]> {
  // 이벤트 기간 중 구매한 고객
  const eventPurchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      purchaseDate: { gte: eventStart, lte: eventEnd },
    },
    select: {
      customerId: true,
      ticketName: true,
    },
    orderBy: { purchaseDate: 'asc' },
  })

  if (eventPurchases.length === 0) {
    return []
  }

  // 고유 고객 ID 추출
  const customerIds = [...new Set(eventPurchases.map((p) => p.customerId))]

  // 모든 이전 구매 이력 한 번에 조회 (배치)
  const previousPurchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      purchaseDate: { lt: eventStart },
    },
    select: {
      customerId: true,
      ticketName: true,
      purchaseDate: true,
    },
    orderBy: { purchaseDate: 'desc' },
  })

  // 고객별 가장 최근 이전 구매만 추출
  const previousPurchaseMap = new Map<string, string>()
  for (const p of previousPurchases) {
    if (!previousPurchaseMap.has(p.customerId)) {
      previousPurchaseMap.set(p.customerId, p.ticketName)
    }
  }

  // 업그레이드 계산
  const upgrades: Map<string, number> = new Map()
  const processedCustomers = new Set<string>()
  const ticketOrder = ['당일권', '시간권', '기간권', '고정석']

  for (const purchase of eventPurchases) {
    if (processedCustomers.has(purchase.customerId)) continue
    processedCustomers.add(purchase.customerId)

    const previousTicketName = previousPurchaseMap.get(purchase.customerId)
    if (!previousTicketName) continue

    const prevType = inferTicketTypeSimple(previousTicketName)
    const currType = inferTicketTypeSimple(purchase.ticketName)

    if (ticketOrder.indexOf(currType) > ticketOrder.indexOf(prevType)) {
      const key = `${prevType}->${currType}`
      upgrades.set(key, (upgrades.get(key) || 0) + 1)
    }
  }

  // 업그레이드 데이터 생성
  const result: { fromTicket: string; toTicket: string; count: number; upgradeRate: number }[] = []

  for (const [key, count] of upgrades) {
    const [fromTicket, toTicket] = key.split('->')

    const fromTicketUsers = eventPurchases.filter(
      (p) => inferTicketTypeSimple(p.ticketName) === fromTicket
    ).length

    const upgradeRate = fromTicketUsers > 0 ? (count / fromTicketUsers) * 100 : 0

    result.push({
      fromTicket,
      toTicket,
      count,
      upgradeRate: Math.round(upgradeRate * 10) / 10,
    })
  }

  return result.sort((a, b) => b.count - a.count)
}

function inferTicketTypeSimple(ticketName: string): string {
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

// ===== 시즌 지수 기반 세그먼트 예측 함수 =====

// 최소 필요 데이터 개월 수 (이 미만이면 전체 지점 평균 사용)
const MIN_MONTHS_FOR_INDIVIDUAL = 6

/**
 * 단일 지점의 월별 세그먼트별 인원수 수집
 * (시즌 지수 계산용 - 변화율이 아닌 실제 인원수)
 */
async function getMonthlySegmentCountsForBranch(
  branchId: string
): Promise<{
  data: Map<number, Map<string, { total: number; count: number }>> // month -> segment -> {total, count}
  monthsWithData: number
}> {
  const result = new Map<number, Map<string, { total: number; count: number }>>()

  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const oldestVisit = await prisma.dailyVisitor.findFirst({
    where: { branchId },
    orderBy: { visitDate: 'asc' },
    select: { visitDate: true },
  })

  if (!oldestVisit) {
    return { data: result, monthsWithData: 0 }
  }

  const startDate = oldestVisit.visitDate > twoYearsAgo ? oldestVisit.visitDate : twoYearsAgo

  for (let year = startDate.getFullYear(); year <= now.getFullYear(); year++) {
    const startMonth = year === startDate.getFullYear() ? startDate.getMonth() + 1 : 1
    const endMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12

    for (let month = startMonth; month <= endMonth; month++) {
      const midDate = new Date(year, month - 1, 15)
      if (midDate > now) continue

      const eventStart = new Date(year, month - 1, 5)
      const eventEnd = new Date(year, month - 1, 25)
      if (eventEnd > now) continue

      try {
        const { segmentChanges } = await trackSegmentChanges(branchId, eventStart, eventEnd)

        if (!result.has(month)) {
          result.set(month, new Map())
        }

        const monthData = result.get(month)!

        // 세그먼트별 인원수(countAfter) 수집
        for (const change of segmentChanges) {
          const existing = monthData.get(change.segmentName)
          if (existing) {
            monthData.set(change.segmentName, {
              total: existing.total + change.countAfter,
              count: existing.count + 1,
            })
          } else {
            monthData.set(change.segmentName, { total: change.countAfter, count: 1 })
          }
        }
      } catch {
        continue
      }
    }
  }

  return { data: result, monthsWithData: result.size }
}

/**
 * 전체 지점의 월별 세그먼트별 인원수 수집 (fallback용)
 */
async function getAllBranchesMonthlySegmentCounts(): Promise<
  Map<number, Map<string, { total: number; count: number }>>
> {
  const result = new Map<number, Map<string, { total: number; count: number }>>()

  const branches = await prisma.branch.findMany({
    select: { id: true },
  })

  if (branches.length === 0) {
    return result
  }

  for (const branch of branches) {
    const { data: branchData } = await getMonthlySegmentCountsForBranch(branch.id)

    for (const [month, segmentData] of branchData) {
      if (!result.has(month)) {
        result.set(month, new Map())
      }

      const monthData = result.get(month)!

      for (const [segmentName, { total, count }] of segmentData) {
        const existing = monthData.get(segmentName)
        if (existing) {
          monthData.set(segmentName, {
            total: existing.total + total,
            count: existing.count + count,
          })
        } else {
          monthData.set(segmentName, { total, count })
        }
      }
    }
  }

  return result
}

/**
 * 세그먼트별 시즌 지수 계산
 * 공식: 시즌지수[세그먼트] = 해당월평균인원수[세그먼트] / 연평균인원수[세그먼트]
 */
function calculatePerSegmentSeasonIndex(
  monthlySegmentCounts: Map<number, Map<string, { total: number; count: number }>>,
  targetMonth: number
): Map<string, { index: number; reason: string }> {
  const result = new Map<string, { index: number; reason: string }>()

  if (monthlySegmentCounts.size === 0) {
    for (const segment of SEGMENT_ORDER) {
      result.set(segment, { index: 1.0, reason: '데이터 부족' })
    }
    return result
  }

  // 세그먼트별 연평균 계산
  const yearlyAvgBySegment = new Map<string, number>()
  for (const segment of SEGMENT_ORDER) {
    let totalSum = 0
    let totalCount = 0
    for (const [, segmentData] of monthlySegmentCounts) {
      const data = segmentData.get(segment)
      if (data && data.count > 0) {
        totalSum += data.total
        totalCount += data.count
      }
    }
    yearlyAvgBySegment.set(segment, totalCount > 0 ? totalSum / totalCount : 0)
  }

  // 대상 월의 세그먼트별 평균 계산
  const targetMonthData = monthlySegmentCounts.get(targetMonth)

  for (const segment of SEGMENT_ORDER) {
    const yearlyAvg = yearlyAvgBySegment.get(segment) || 0
    const targetData = targetMonthData?.get(segment)
    const targetAvg = targetData && targetData.count > 0 ? targetData.total / targetData.count : 0

    if (yearlyAvg > 0 && targetAvg > 0) {
      const index = targetAvg / yearlyAvg
      result.set(segment, {
        index,
        reason: `${targetMonth}월 평균 ${Math.round(targetAvg)}명 / 연평균 ${Math.round(yearlyAvg)}명`,
      })
    } else {
      result.set(segment, { index: 1.0, reason: '데이터 부족' })
    }
  }

  return result
}

/**
 * 세그먼트별 추세 계수 계산
 * 공식: 추세계수[세그먼트] = 최근3개월평균[세그먼트] / 이전3개월평균[세그먼트]
 */
function calculatePerSegmentTrendCoeff(
  eventStart: Date,
  monthlySegmentCounts: Map<number, Map<string, { total: number; count: number }>>
): Map<string, { coeff: number; reason: string }> {
  const result = new Map<string, { coeff: number; reason: string }>()

  if (monthlySegmentCounts.size < 6) {
    for (const segment of SEGMENT_ORDER) {
      result.set(segment, { coeff: 1.0, reason: '6개월 미만 데이터' })
    }
    return result
  }

  // 최근 6개월 데이터 수집 (이벤트 시작 기준)
  const recentMonths: number[] = []
  for (let i = 1; i <= 6; i++) {
    const checkDate = new Date(eventStart)
    checkDate.setMonth(checkDate.getMonth() - i)
    recentMonths.push(checkDate.getMonth() + 1)
  }

  for (const segment of SEGMENT_ORDER) {
    // 최근 3개월 평균
    let recentSum = 0
    let recentCount = 0
    for (let i = 0; i < 3; i++) {
      const month = recentMonths[i]
      const monthData = monthlySegmentCounts.get(month)
      const segmentData = monthData?.get(segment)
      if (segmentData && segmentData.count > 0) {
        recentSum += segmentData.total / segmentData.count
        recentCount++
      }
    }
    const recentAvg = recentCount > 0 ? recentSum / recentCount : 0

    // 이전 3개월 평균
    let prevSum = 0
    let prevCount = 0
    for (let i = 3; i < 6; i++) {
      const month = recentMonths[i]
      const monthData = monthlySegmentCounts.get(month)
      const segmentData = monthData?.get(segment)
      if (segmentData && segmentData.count > 0) {
        prevSum += segmentData.total / segmentData.count
        prevCount++
      }
    }
    const prevAvg = prevCount > 0 ? prevSum / prevCount : 0

    if (prevAvg > 0 && recentAvg > 0) {
      const coeff = recentAvg / prevAvg
      result.set(segment, {
        coeff,
        reason: `최근3개월 ${Math.round(recentAvg)}명 / 이전3개월 ${Math.round(prevAvg)}명`,
      })
    } else {
      result.set(segment, { coeff: 1.0, reason: '데이터 부족' })
    }
  }

  return result
}

/**
 * 단일 지점의 월별 세그먼트 변화 패턴 계산
 */
async function getMonthlySegmentAveragesForBranch(
  branchId: string
): Promise<{ data: Map<number, Map<string, { avg: number; count: number }>>; monthsWithData: number }> {
  const result = new Map<number, Map<string, { avg: number; count: number }>>()

  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const oldestVisit = await prisma.dailyVisitor.findFirst({
    where: { branchId },
    orderBy: { visitDate: 'asc' },
    select: { visitDate: true },
  })

  if (!oldestVisit) {
    return { data: result, monthsWithData: 0 }
  }

  const startDate = oldestVisit.visitDate > twoYearsAgo ? oldestVisit.visitDate : twoYearsAgo

  for (let year = startDate.getFullYear(); year <= now.getFullYear(); year++) {
    const startMonth = year === startDate.getFullYear() ? startDate.getMonth() + 1 : 1
    const endMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12

    for (let month = startMonth; month <= endMonth; month++) {
      const midDate = new Date(year, month - 1, 15)
      if (midDate > now) continue

      const eventStart = new Date(year, month - 1, 5)
      const eventEnd = new Date(year, month - 1, 25)
      if (eventEnd > now) continue

      try {
        const { segmentChanges } = await trackSegmentChanges(branchId, eventStart, eventEnd)

        if (!result.has(month)) {
          result.set(month, new Map())
        }

        const monthData = result.get(month)!

        for (const change of segmentChanges) {
          const existing = monthData.get(change.segmentName)
          if (existing) {
            const newTotal = existing.avg * existing.count + change.changePercent
            const newCount = existing.count + 1
            monthData.set(change.segmentName, { avg: newTotal / newCount, count: newCount })
          } else {
            monthData.set(change.segmentName, { avg: change.changePercent, count: 1 })
          }
        }
      } catch {
        continue
      }
    }
  }

  return { data: result, monthsWithData: result.size }
}

/**
 * 전체 지점의 월별 세그먼트 변화 평균 계산 (fallback용)
 */
async function getAllBranchesMonthlySegmentAverages(): Promise<Map<number, Map<string, { avg: number; count: number }>>> {
  const result = new Map<number, Map<string, { avg: number; count: number }>>()

  // 모든 지점 조회
  const branches = await prisma.branch.findMany({
    select: { id: true },
  })

  if (branches.length === 0) {
    return result
  }

  const now = new Date()
  const twoYearsAgo = new Date(now)
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  // 각 지점의 데이터를 병합
  for (const branch of branches) {
    const { data: branchData } = await getMonthlySegmentAveragesForBranch(branch.id)

    for (const [month, segmentData] of branchData) {
      if (!result.has(month)) {
        result.set(month, new Map())
      }

      const monthData = result.get(month)!

      for (const [segmentName, { avg, count }] of segmentData) {
        const existing = monthData.get(segmentName)
        if (existing) {
          // 가중 평균으로 병합
          const newTotal = existing.avg * existing.count + avg * count
          const newCount = existing.count + count
          monthData.set(segmentName, { avg: newTotal / newCount, count: newCount })
        } else {
          monthData.set(segmentName, { avg, count })
        }
      }
    }
  }

  return result
}

/**
 * 지점의 월별 세그먼트 변화 패턴 계산 (데이터 부족 시 전체 지점 평균으로 fallback)
 */
async function getMonthlySegmentAverages(
  branchId: string
): Promise<{ data: Map<number, Map<string, { avg: number; count: number }>>; source: 'INDIVIDUAL' | 'ALL_BRANCHES' }> {
  // 1. 먼저 해당 지점 데이터 시도
  const { data: individualData, monthsWithData } = await getMonthlySegmentAveragesForBranch(branchId)

  // 2. 데이터가 충분하면 개별 지점 데이터 사용
  if (monthsWithData >= MIN_MONTHS_FOR_INDIVIDUAL) {
    console.log(`[세그먼트 예측] ${branchId}: 개별 지점 데이터 사용 (${monthsWithData}개월)`)
    return { data: individualData, source: 'INDIVIDUAL' }
  }

  // 3. 데이터가 부족하면 전체 지점 평균으로 fallback
  console.log(`[세그먼트 예측] ${branchId}: 데이터 부족 (${monthsWithData}개월), 전체 지점 평균 사용`)
  const allBranchesData = await getAllBranchesMonthlySegmentAverages()

  return { data: allBranchesData, source: 'ALL_BRANCHES' }
}

/**
 * 세그먼트별 시즌 지수 계산
 * forecast.ts의 calculateSeasonIndex와 유사한 패턴
 */
function calculateSegmentSeasonIndex(
  monthlyAverages: Map<number, Map<string, { avg: number; count: number }>>,
  targetMonth: number
): Map<string, { index: number; expectedChange: number; reason: string }> {
  const result = new Map<string, { index: number; expectedChange: number; reason: string }>()

  if (monthlyAverages.size === 0) {
    // 데이터 없으면 기본값 반환
    for (const segment of SEGMENT_ORDER) {
      result.set(segment, { index: 1.0, expectedChange: 0, reason: '데이터 부족으로 시즌 지수 미적용' })
    }
    return result
  }

  // 세그먼트별 전체 평균 계산
  const overallAvgBySegment = new Map<string, { totalSum: number; totalCount: number }>()

  for (const [, segmentData] of monthlyAverages) {
    for (const [segmentName, { avg, count }] of segmentData) {
      const existing = overallAvgBySegment.get(segmentName) || { totalSum: 0, totalCount: 0 }
      existing.totalSum += avg * count
      existing.totalCount += count
      overallAvgBySegment.set(segmentName, existing)
    }
  }

  // 해당 월의 데이터
  const targetMonthData = monthlyAverages.get(targetMonth)

  for (const segment of SEGMENT_ORDER) {
    const overall = overallAvgBySegment.get(segment)
    const target = targetMonthData?.get(segment)

    if (!overall || overall.totalCount === 0) {
      result.set(segment, { index: 1.0, expectedChange: 0, reason: `${segment} 전체 데이터 없음` })
      continue
    }

    const overallAvg = overall.totalSum / overall.totalCount

    if (!target || target.count === 0) {
      // 해당 월 데이터 없으면 전체 평균 사용
      result.set(segment, {
        index: 1.0,
        expectedChange: Math.round(overallAvg * 10) / 10,
        reason: `${targetMonth}월 데이터 없음, 전체 평균 ${overallAvg.toFixed(1)}% 적용`,
      })
      continue
    }

    // 시즌 지수 = 해당 월 평균 / 전체 평균
    const index = overallAvg !== 0 ? target.avg / overallAvg : 1.0
    const expectedChange = target.avg

    const percentDiff = ((index - 1) * 100).toFixed(1)
    const direction = index >= 1 ? '높음' : '낮음'

    result.set(segment, {
      index,
      expectedChange: Math.round(expectedChange * 10) / 10,
      reason: `${targetMonth}월 ${segment}는 연평균 대비 ${Math.abs(Number(percentDiff))}% ${direction} (${target.count}회 기준)`,
    })
  }

  return result
}

/**
 * 전체 평균 + 시즌 지수 기반 세그먼트 예상치 계산
 * - 해당 지점 데이터가 충분하면 개별 지점 데이터 사용
 * - 데이터 부족 시 전체 지점 평균으로 fallback
 */
async function getExpectedSegmentChanges(
  branchId: string,
  targetMonth: number
): Promise<{
  expectedChanges: Map<string, { expectedChange: number; expectedChangePercent: number; reason: string }>
  hasData: boolean
  dataSource: 'INDIVIDUAL' | 'ALL_BRANCHES' | 'DEFAULT'
}> {
  const { data: monthlyAverages, source } = await getMonthlySegmentAverages(branchId)

  if (monthlyAverages.size === 0) {
    // 데이터가 전혀 없으면 기본값 반환
    const defaultChanges = new Map<string, { expectedChange: number; expectedChangePercent: number; reason: string }>()
    for (const segment of SEGMENT_ORDER) {
      defaultChanges.set(segment, {
        expectedChange: 0,
        expectedChangePercent: 0,
        reason: '과거 데이터 부족으로 예상치 산출 불가',
      })
    }
    return { expectedChanges: defaultChanges, hasData: false, dataSource: 'DEFAULT' }
  }

  const seasonIndexes = calculateSegmentSeasonIndex(monthlyAverages, targetMonth)

  const expectedChanges = new Map<string, { expectedChange: number; expectedChangePercent: number; reason: string }>()

  const sourceLabel = source === 'INDIVIDUAL' ? '개별 지점' : '전체 지점 평균'

  for (const [segment, { expectedChange, reason }] of seasonIndexes) {
    expectedChanges.set(segment, {
      expectedChange: Math.round(expectedChange), // 실제 변화 수
      expectedChangePercent: expectedChange,       // 변화율
      reason: `[${sourceLabel}] ${reason}`,
    })
  }

  return { expectedChanges, hasData: true, dataSource: source }
}

// ===== 외부요인 기반 예측 함수 =====

/**
 * 과거 외부요인 기간의 세그먼트 변화 패턴을 학습하여 예측
 */
export async function getExternalFactorSegmentImpact(
  branchId: string,
  factorTypes: string[],
  eventStart: Date,
  eventEnd: Date
): Promise<{
  predictions: SegmentChangePrediction[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  factorCount: number
}> {
  if (factorTypes.length === 0) {
    return { predictions: [], confidence: 'LOW', factorCount: 0 }
  }

  // 과거 동일 유형 외부요인 조회 (최대 5개)
  const pastFactors = await prisma.externalFactor.findMany({
    where: {
      type: { in: factorTypes },
      endDate: { lt: eventStart },
      branches: { some: { branchId } },
    },
    orderBy: { endDate: 'desc' },
    take: 5,
  })

  if (pastFactors.length === 0) {
    return { predictions: [], confidence: 'LOW', factorCount: 0 }
  }

  // 세그먼트별 변화율 수집
  const allChanges: Map<string, number[]> = new Map()
  for (const segment of SEGMENT_ORDER) {
    allChanges.set(segment, [])
  }

  // 각 과거 요인 기간의 세그먼트 변화 계산
  for (const factor of pastFactors) {
    try {
      const { segmentChanges } = await trackSegmentChanges(
        branchId,
        factor.startDate,
        factor.endDate
      )

      for (const change of segmentChanges) {
        const existing = allChanges.get(change.segmentName) || []
        existing.push(change.changePercent)
        allChanges.set(change.segmentName, existing)
      }
    } catch {
      // 데이터 부족 등의 오류 시 건너뜀
      continue
    }
  }

  // 평균 예측값 계산
  const predictions: SegmentChangePrediction[] = []

  for (const [segmentName, changes] of allChanges) {
    if (changes.length === 0) continue

    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length

    predictions.push({
      segmentName,
      expectedChangePercent: Math.round(avgChange * 10) / 10,
      confidence: changes.length >= 4 ? 'HIGH' : changes.length >= 2 ? 'MEDIUM' : 'LOW',
      basedOnFactorCount: changes.length,
      reason: `과거 ${factorTypes.join(', ')} ${changes.length}회 평균 ${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)}%`,
    })
  }

  const confidence = pastFactors.length >= 4 ? 'HIGH' : pastFactors.length >= 2 ? 'MEDIUM' : 'LOW'

  return { predictions, confidence, factorCount: pastFactors.length }
}

/**
 * 과거 외부요인 기간의 이용권 업그레이드 패턴을 학습하여 예측
 */
export async function getExternalFactorTicketUpgradeImpact(
  branchId: string,
  factorTypes: string[],
  eventStart: Date,
  eventEnd: Date
): Promise<{
  predictions: TicketUpgradePrediction[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  factorCount: number
}> {
  if (factorTypes.length === 0) {
    return { predictions: [], confidence: 'LOW', factorCount: 0 }
  }

  // 과거 동일 유형 외부요인 조회 (최대 5개)
  const pastFactors = await prisma.externalFactor.findMany({
    where: {
      type: { in: factorTypes },
      endDate: { lt: eventStart },
      branches: { some: { branchId } },
    },
    orderBy: { endDate: 'desc' },
    take: 5,
  })

  if (pastFactors.length === 0) {
    return { predictions: [], confidence: 'LOW', factorCount: 0 }
  }

  // 업그레이드 패턴 수집
  const upgradePatterns: Map<string, { counts: number[]; rates: number[] }> = new Map()

  for (const factor of pastFactors) {
    try {
      const upgrades = await trackTicketUpgrades(
        branchId,
        factor.startDate,
        factor.endDate
      )

      for (const upgrade of upgrades) {
        const key = `${upgrade.fromTicket}->${upgrade.toTicket}`
        const existing = upgradePatterns.get(key) || { counts: [], rates: [] }
        existing.counts.push(upgrade.count)
        existing.rates.push(upgrade.upgradeRate)
        upgradePatterns.set(key, existing)
      }
    } catch {
      continue
    }
  }

  // 평균 예측값 계산
  const predictions: TicketUpgradePrediction[] = []

  for (const [key, data] of upgradePatterns) {
    const [fromTicket, toTicket] = key.split('->')
    const avgCount = data.counts.reduce((sum, c) => sum + c, 0) / data.counts.length
    const avgRate = data.rates.reduce((sum, r) => sum + r, 0) / data.rates.length

    predictions.push({
      fromTicket,
      toTicket,
      expectedCount: Math.round(avgCount),
      expectedRate: Math.round(avgRate * 10) / 10,
      confidence: data.counts.length >= 4 ? 'HIGH' : data.counts.length >= 2 ? 'MEDIUM' : 'LOW',
      basedOnFactorCount: data.counts.length,
      reason: `과거 ${factorTypes.join(', ')} ${data.counts.length}회 평균`,
    })
  }

  predictions.sort((a, b) => b.expectedCount - a.expectedCount)

  const confidence = pastFactors.length >= 4 ? 'HIGH' : pastFactors.length >= 2 ? 'MEDIUM' : 'LOW'

  return { predictions, confidence, factorCount: pastFactors.length }
}

/**
 * 외부요인 기반 통합 예측 (세그먼트 + 이용권 업그레이드)
 */
export async function predictEventImpactWithExternalFactors(
  branchId: string,
  factorTypes: string[],
  eventStart: Date,
  eventEnd: Date
): Promise<ExternalFactorImpactPrediction | null> {
  if (factorTypes.length === 0) {
    return null
  }

  // 세그먼트 예측과 이용권 업그레이드 예측 병렬 실행
  const [segmentResult, ticketResult] = await Promise.all([
    getExternalFactorSegmentImpact(branchId, factorTypes, eventStart, eventEnd),
    getExternalFactorTicketUpgradeImpact(branchId, factorTypes, eventStart, eventEnd),
  ])

  // 데이터가 전혀 없으면 null 반환
  if (segmentResult.factorCount === 0 && ticketResult.factorCount === 0) {
    return null
  }

  // 전체 신뢰도 결정 (더 낮은 쪽 기준)
  const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
  const minConfidence = Math.min(
    confidenceOrder[segmentResult.confidence],
    confidenceOrder[ticketResult.confidence]
  )
  const overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    minConfidence >= 3 ? 'HIGH' : minConfidence >= 2 ? 'MEDIUM' : 'LOW'

  return {
    factorTypes,
    segmentPredictions: segmentResult.predictions,
    ticketUpgradePredictions: ticketResult.predictions,
    overallConfidence,
  }
}

/**
 * 세그먼트 현황을 과거 추세와 비교하여 분석
 *
 * 구조 변경: "이전/이후" → "예상/실제"
 * - 실제 (countAfter): 이벤트 기간의 실제 세그먼트 수 (CRM과 동일)
 * - 예상 (countBefore): 과거 동일 기간의 세그먼트 수
 *
 * YoY: 전년 동일 기간 / MoM: 전월 동일 요일
 */
export async function trackSegmentChangesWithComparison(
  branchId: string,
  eventStart: Date,
  eventEnd: Date,
  comparisonType: ComparisonType
): Promise<{
  segmentChanges: SegmentChangeComparison[]
  segmentMigrations: SegmentMigrationComparison[]
  hasComparisonData: boolean
  periodInfo: {
    actualPeriod: { start: string; end: string }
    comparisonPeriod: { start: string; end: string } | null
    comparisonSource: 'YOY' | 'MOM' | 'SEASONAL' | null
    coefficients: {
      seasonIndex: Record<string, number>
      trendCoeff: Record<string, number>
      dataMonths: number
    }
  }
}> {
  // 현재 기간 세그먼트 계산 (CRM과 동일한 실제 값)
  const currentResult = await trackSegmentChanges(branchId, eventStart, eventEnd)

  // 비교 기간 계산 (YoY → MoM 순서로 fallback)
  const eventDays = Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // YoY 기간 (전년 동기)
  const yoyStart = new Date(eventStart)
  yoyStart.setFullYear(yoyStart.getFullYear() - 1)
  const yoyEnd = new Date(eventEnd)
  yoyEnd.setFullYear(yoyEnd.getFullYear() - 1)

  // MoM 기간 (이벤트 바로 직전 동일 기간)
  // 예: 이벤트가 12-05 ~ 12-25면, MoM은 11-14 ~ 12-04
  const momEnd = new Date(eventStart)
  momEnd.setDate(momEnd.getDate() - 1)  // 이벤트 시작 전날
  const momStart = new Date(momEnd)
  momStart.setDate(momStart.getDate() - eventDays + 1)  // 동일 기간

  // YoY 데이터 확인
  const yoyDataCheck = await prisma.dailyVisitor.findFirst({
    where: {
      branchId,
      visitDate: { gte: yoyStart, lte: yoyEnd },
    },
  })

  // MoM 데이터 확인
  const momDataCheck = await prisma.dailyVisitor.findFirst({
    where: {
      branchId,
      visitDate: { gte: momStart, lte: momEnd },
    },
  })

  // 실제 사용할 비교 기간 결정
  let comparisonStart: Date
  let comparisonEnd: Date
  let beforeCounts: Map<string, number> = new Map()  // 이전값 (실제 비교 기간 값)
  let expectedCounts: Map<string, number> = new Map()  // 예상값 (이전값 기반 예측)
  let hasComparisonData = false
  let comparisonSource: 'YOY' | 'MOM' | 'SEASONAL' | null = null

  // 시즌/추세 계수 계산 (세그먼트별로 개별 계산)
  const targetMonth = eventStart.getMonth() + 1
  const seasonIndex: Map<string, number> = new Map()
  const trendCoeff: Map<string, number> = new Map()
  let validDataMonths = 0
  let monthlySegmentCounts: Map<number, Map<string, { total: number; count: number }>> = new Map()

  // YoY 데이터가 없을 때만 시즌/추세 계수 계산
  if (!yoyDataCheck) {
    // 세그먼트별 월별 인원수 수집
    const { data: branchData, monthsWithData } = await getMonthlySegmentCountsForBranch(branchId)
    validDataMonths = monthsWithData

    // 데이터 부족 시 전체 지점 데이터 fallback
    if (monthsWithData < MIN_MONTHS_FOR_INDIVIDUAL) {
      monthlySegmentCounts = await getAllBranchesMonthlySegmentCounts()
      console.log('[세그먼트 비교] 개별 지점 데이터 부족 - 전체 지점 데이터 사용')
    } else {
      monthlySegmentCounts = branchData
    }

    // 세그먼트별 시즌 지수 계산
    const perSegmentSeasonIndex = calculatePerSegmentSeasonIndex(monthlySegmentCounts, targetMonth)

    // 세그먼트별 추세 계수 계산
    const perSegmentTrendCoeff = calculatePerSegmentTrendCoeff(eventStart, monthlySegmentCounts)

    // Map에 세그먼트별 값 적용
    for (const seg of SEGMENT_ORDER) {
      seasonIndex.set(seg, perSegmentSeasonIndex.get(seg)?.index ?? 1.0)
      trendCoeff.set(seg, perSegmentTrendCoeff.get(seg)?.coeff ?? 1.0)
    }

    console.log('[세그먼트 비교] 세그먼트별 시즌/추세 계수:', {
      targetMonth,
      validDataMonths,
      seasonIndex: Object.fromEntries(
        Array.from(seasonIndex.entries()).map(([k, v]) => [k, v.toFixed(3)])
      ),
      trendCoeff: Object.fromEntries(
        Array.from(trendCoeff.entries()).map(([k, v]) => [k, v.toFixed(3)])
      ),
    })
  } else {
    // YoY 데이터가 있으면 시즌/추세 = 1.0 (실제 비교 데이터 사용)
    for (const seg of SEGMENT_ORDER) {
      seasonIndex.set(seg, 1.0)
      trendCoeff.set(seg, 1.0)
    }
    console.log('[세그먼트 비교] YoY 데이터 있음 - 시즌/추세 미적용')
  }

  if (yoyDataCheck) {
    // YoY 데이터가 있으면 사용
    comparisonStart = yoyStart
    comparisonEnd = yoyEnd
    const comparisonResult = await trackSegmentChanges(branchId, comparisonStart, comparisonEnd)
    for (const seg of comparisonResult.segmentChanges) {
      beforeCounts.set(seg.segmentName, seg.countAfter)
      // 예상값 = 이전값 × 시즌 × 추세
      const before = seg.countAfter
      const season = seasonIndex.get(seg.segmentName) || 1.0
      const trend = trendCoeff.get(seg.segmentName) || 1.0
      expectedCounts.set(seg.segmentName, Math.round(before * season * trend))
    }
    hasComparisonData = true
    comparisonSource = 'YOY'
    console.log('[세그먼트 비교] YoY 데이터 사용:', {
      start: comparisonStart.toISOString().split('T')[0],
      end: comparisonEnd.toISOString().split('T')[0],
      before: Object.fromEntries(beforeCounts),
      expected: Object.fromEntries(expectedCounts),
    })
  } else if (momDataCheck) {
    // YoY 없으면 MoM 데이터 사용
    comparisonStart = momStart
    comparisonEnd = momEnd
    const comparisonResult = await trackSegmentChanges(branchId, comparisonStart, comparisonEnd)
    for (const seg of comparisonResult.segmentChanges) {
      beforeCounts.set(seg.segmentName, seg.countAfter)
      // 예상값 = 이전값 × 시즌 × 추세
      const before = seg.countAfter
      const season = seasonIndex.get(seg.segmentName) || 1.0
      const trend = trendCoeff.get(seg.segmentName) || 1.0
      expectedCounts.set(seg.segmentName, Math.round(before * season * trend))
    }
    hasComparisonData = true
    comparisonSource = 'MOM'
    console.log('[세그먼트 비교] MoM 데이터 사용 (YoY 없음):', {
      start: comparisonStart.toISOString().split('T')[0],
      end: comparisonEnd.toISOString().split('T')[0],
      before: Object.fromEntries(beforeCounts),
      expected: Object.fromEntries(expectedCounts),
    })
  } else {
    // 둘 다 없으면 SEASONAL fallback (이전값 없이 예상값만)
    comparisonStart = yoyStart  // 기간 정보용
    comparisonEnd = yoyEnd

    // 세그먼트별 연평균 계산 (monthlySegmentCounts에서)
    const overallAvg = new Map<string, number>()
    for (const segment of SEGMENT_ORDER) {
      let totalSum = 0
      let totalCount = 0
      for (const [, segmentData] of monthlySegmentCounts) {
        const data = segmentData.get(segment)
        if (data && data.count > 0) {
          totalSum += data.total
          totalCount += data.count
        }
      }
      overallAvg.set(segment, totalCount > 0 ? totalSum / totalCount : 0)
    }

    // 예상값 계산: 전체 평균 × 시즌 지수 × 추세 계수
    let hasAnyData = false
    for (const segmentName of SEGMENT_ORDER) {
      const avg = overallAvg.get(segmentName) || 0
      const season = seasonIndex.get(segmentName) || 1.0
      const trend = trendCoeff.get(segmentName) || 1.0

      const expected = Math.round(avg * season * trend)
      expectedCounts.set(segmentName, expected)
      // beforeCounts는 비워둠 (이전값 없음)

      if (avg > 0) hasAnyData = true
    }

    if (hasAnyData) {
      hasComparisonData = true
      comparisonSource = 'SEASONAL'
      console.log('[세그먼트 비교] SEASONAL fallback - 전체평균×시즌×추세:', {
        overallAvg: Object.fromEntries(overallAvg),
        seasonIndex: Object.fromEntries(seasonIndex),
        trendCoeff: Object.fromEntries(trendCoeff),
        expected: Object.fromEntries(expectedCounts),
      })
    } else {
      hasComparisonData = false
      comparisonSource = null
    }
  }

  // 기간 정보
  // SEASONAL의 경우 비교 기간이 특정 기간이 아니라 "최근 3개월 평균"이므로 null로 설정
  const periodInfo = {
    actualPeriod: {
      start: eventStart.toISOString().split('T')[0],
      end: eventEnd.toISOString().split('T')[0],
    },
    comparisonPeriod: (hasComparisonData && comparisonSource !== 'SEASONAL') ? {
      start: comparisonStart.toISOString().split('T')[0],
      end: comparisonEnd.toISOString().split('T')[0],
    } : null,
    comparisonSource,
    // 시즌/추세 계수 정보 (디버깅 및 UI 표시용)
    coefficients: {
      seasonIndex: Object.fromEntries(seasonIndex) as Record<string, number>,
      trendCoeff: Object.fromEntries(trendCoeff) as Record<string, number>,
      dataMonths: validDataMonths,  // 사용 가능한 월 데이터 수
    },
  }

  console.log('[세그먼트 비교] 실제 vs 예상:', {
    actualPeriod: periodInfo.actualPeriod,
    comparisonPeriod: periodInfo.comparisonPeriod,
    comparisonSource,
    hasData: hasComparisonData,
    coefficients: periodInfo.coefficients,
    before: Object.fromEntries(beforeCounts),
    expected: Object.fromEntries(expectedCounts),
  })

  // 세그먼트 비교 데이터 생성
  const segmentChanges: SegmentChangeComparison[] = currentResult.segmentChanges.map((current) => {
    const afterCount = current.countAfter  // 이후값 (실제 이벤트 기간)
    const beforeCount = beforeCounts.get(current.segmentName) ?? null  // 이전값 (YoY/MoM 실제값, 없으면 null)
    const expectedCount = expectedCounts.get(current.segmentName) ?? 0  // 예상값

    // 이전 vs 이후: 실제 변화 (이전값이 있을 때만)
    const change = beforeCount !== null ? (afterCount - beforeCount) : 0
    const changePercent = beforeCount !== null && beforeCount > 0
      ? ((change / beforeCount) * 100)
      : 0

    // 이후 vs 예상: 성과 (예상값 대비 얼마나 잘했나)
    const vsExpected = hasComparisonData ? (afterCount - expectedCount) : 0
    const vsExpectedPercent = hasComparisonData && expectedCount > 0
      ? ((vsExpected / expectedCount) * 100)
      : 0

    // 부정적 세그먼트(이탈위험, 이탈)는 감소가 좋은 것
    // 긍정적 세그먼트(VIP, 단골 등)는 증가가 좋은 것
    let isBetterThanExpected: boolean = true
    if (hasComparisonData) {
      if (current.isNegativeSegment) {
        // 이탈위험/이탈: 실제가 예상보다 적으면 좋음
        isBetterThanExpected = afterCount < expectedCount
      } else {
        // VIP/단골/일반 등: 실제가 예상보다 많으면 좋음
        isBetterThanExpected = afterCount > expectedCount
      }
    }

    return {
      segmentName: current.segmentName,
      countBefore: beforeCount,      // 이전값 (YoY/MoM 실제값, SEASONAL이면 null)
      countAfter: afterCount,        // 이후값 (실제 이벤트 기간)
      expectedCount: expectedCount,  // 예상값 (이전×시즌×추세 또는 전체평균×시즌×추세)
      change: change,                // 이후 - 이전 (실제 변화)
      changePercent: Math.round(changePercent * 10) / 10,
      vsExpected: vsExpected,        // 이후 - 예상 (성과)
      vsExpectedPercent: Math.round(vsExpectedPercent * 10) / 10,
      isNegativeSegment: current.isNegativeSegment,
      isBetterThanExpected,
    }
  })

  // 세그먼트 이동은 단일 기간이므로 빈 배열
  const segmentMigrations: SegmentMigrationComparison[] = []

  return {
    segmentChanges,
    segmentMigrations,
    hasComparisonData,
    periodInfo,
  }
}
