import { prisma } from '@/lib/prisma'
import { calculateVisitSegment } from '@/lib/crm/segment-calculator'
import { db, type DateRange } from '@/lib/db'
import type { SegmentChangeData, SegmentMigration } from '@/types/strategy'

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
 * 이벤트 기간 전후의 세그먼트 변화 추적 (최적화 버전)
 */
export async function trackSegmentChanges(
  branchId: string,
  eventStart: Date,
  eventEnd: Date
): Promise<{
  segmentChanges: SegmentChangeData[]
  segmentMigrations: SegmentMigration[]
}> {
  // 30일 간의 이전 기간 정의
  const beforeStart = new Date(eventStart)
  beforeStart.setDate(beforeStart.getDate() - 30)
  const beforeEnd = new Date(eventStart)
  beforeEnd.setDate(beforeEnd.getDate() - 1)

  // 이벤트 기간 이후 30일
  const afterEnd = new Date(eventEnd)
  afterEnd.setDate(afterEnd.getDate() + 30)

  // 전체 고객 목록 조회 (이 지점을 한 번이라도 방문한 모든 고객)
  // 이탈/이탈위험 고객도 포함해야 정확한 카운트 가능
  const allBranchCustomers = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { lte: afterEnd }, // afterEnd 이전에 방문한 적 있는 모든 고객
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

  // 전체 고객 처리 (제한 없음)
  const sampledIds = customerIds

  // === 배치 쿼리로 모든 데이터 한 번에 가져오기 ===

  // 1. 모든 고객 정보 일괄 조회
  const customers = await prisma.customer.findMany({
    where: { id: { in: sampledIds } },
    select: {
      id: true,
      firstVisitDate: true,
      lastVisitDate: true,
    },
  })
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  // 2. 모든 방문 기록 조회 (시점별 lastVisitDate 계산용)
  const allVisits = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      customerId: { in: sampledIds },
    },
    select: { customerId: true, visitDate: true },
    orderBy: { visitDate: 'desc' },
  })

  // 고객별 방문 목록 구성
  const visitsByCustomer = new Map<string, Date[]>()
  for (const v of allVisits) {
    if (!v.customerId) continue
    if (!visitsByCustomer.has(v.customerId)) {
      visitsByCustomer.set(v.customerId, [])
    }
    visitsByCustomer.get(v.customerId)!.push(v.visitDate)
  }

  // beforeEnd 시점 기준 마지막 방문일 계산
  const lastVisitAsOfBefore = new Map<string, Date | null>()
  const lastVisitAsOfAfter = new Map<string, Date | null>()

  for (const [customerId, visits] of visitsByCustomer) {
    // beforeEnd 이전의 마지막 방문
    const beforeVisits = visits.filter(v => v <= beforeEnd)
    lastVisitAsOfBefore.set(customerId, beforeVisits.length > 0 ? beforeVisits[0] : null)

    // afterEnd 이전의 마지막 방문
    const afterVisits = visits.filter(v => v <= afterEnd)
    lastVisitAsOfAfter.set(customerId, afterVisits.length > 0 ? afterVisits[0] : null)
  }

  // 3. 이벤트 전 기간 방문 수 (배치 groupBy)
  const beforeVisitCounts = await prisma.dailyVisitor.groupBy({
    by: ['customerId'],
    where: {
      branchId,
      customerId: { in: sampledIds },
      visitDate: { gte: beforeStart, lte: beforeEnd },
    },
    _count: { customerId: true },
  })
  const beforeVisitMap = new Map(
    beforeVisitCounts.map((v) => [v.customerId!, v._count.customerId])
  )

  // 4. 이벤트 후 기간 방문 수 (배치 groupBy)
  const afterVisitCounts = await prisma.dailyVisitor.groupBy({
    by: ['customerId'],
    where: {
      branchId,
      customerId: { in: sampledIds },
      visitDate: { gte: eventEnd, lte: afterEnd },
    },
    _count: { customerId: true },
  })
  const afterVisitMap = new Map(
    afterVisitCounts.map((v) => [v.customerId!, v._count.customerId])
  )

  // 5. 이전 기간 이전 마지막 방문일 (복귀 판단용)
  const previousVisitMap = new Map<string, Date>()
  for (const [customerId, visits] of visitsByCustomer) {
    const prevVisits = visits.filter(v => v < beforeStart)
    if (prevVisits.length > 0) {
      previousVisitMap.set(customerId, prevVisits[0])
    }
  }

  // 6. 고정석/기간권 보유 여부 (배치 조회)
  const fixedSeatPurchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      customerId: { in: sampledIds },
      ticketName: { contains: '고정' },
    },
    select: { customerId: true },
    distinct: ['customerId'],
  })
  const hasFixedSeatSet = new Set(fixedSeatPurchases.map((p) => p.customerId))

  // === 메모리에서 세그먼트 계산 ===
  const migrations: Map<string, number> = new Map()
  const segmentCountBefore: Record<string, number> = {}
  const segmentCountAfter: Record<string, number> = {}

  for (const segment of SEGMENT_ORDER) {
    segmentCountBefore[segment] = 0
    segmentCountAfter[segment] = 0
  }

  for (const customerId of sampledIds) {
    const customerData = customerMap.get(customerId)
    const visits = visitsByCustomer.get(customerId) || []

    // customer 테이블에 없으면 방문 기록에서 firstVisitDate 추출
    // visits는 내림차순 정렬되어 있으므로 마지막 요소가 첫 방문일
    const firstVisitDate = customerData?.firstVisitDate ||
      (visits.length > 0 ? visits[visits.length - 1] : null)

    if (!firstVisitDate) continue // 방문 기록도 없으면 스킵

    // beforeEnd 시점 기준 고객 데이터
    const customerDataBefore = {
      firstVisitDate,
      lastVisitDate: lastVisitAsOfBefore.get(customerId) || null,
    }

    // afterEnd 시점 기준 고객 데이터
    const customerDataAfter = {
      firstVisitDate,
      lastVisitDate: lastVisitAsOfAfter.get(customerId) || null,
    }

    // beforeEnd 시점에 아직 방문한 적 없는 고객은 제외
    if (!customerDataBefore.lastVisitDate && firstVisitDate > beforeEnd) {
      // 이벤트 후에만 첫 방문한 신규 고객 - "이후"에만 카운트
      const segmentAfter = calculateSegmentFromData(
        customerId,
        customerDataAfter,
        afterVisitMap.get(customerId) || 0,
        null,
        hasFixedSeatSet.has(customerId),
        afterEnd,
        eventEnd
      )
      segmentCountAfter[segmentAfter] = (segmentCountAfter[segmentAfter] || 0) + 1
      continue
    }

    // 이벤트 전 세그먼트
    const segmentBefore = calculateSegmentFromData(
      customerId,
      customerDataBefore,
      beforeVisitMap.get(customerId) || 0,
      previousVisitMap.get(customerId) || null,
      hasFixedSeatSet.has(customerId),
      beforeEnd,
      beforeStart
    )

    // 이벤트 후 세그먼트
    const segmentAfter = calculateSegmentFromData(
      customerId,
      customerDataAfter,
      afterVisitMap.get(customerId) || 0,
      previousVisitMap.get(customerId) || null,
      hasFixedSeatSet.has(customerId),
      afterEnd,
      eventEnd
    )

    segmentCountBefore[segmentBefore] = (segmentCountBefore[segmentBefore] || 0) + 1
    segmentCountAfter[segmentAfter] = (segmentCountAfter[segmentAfter] || 0) + 1

    // 세그먼트 이동 기록
    if (segmentBefore !== segmentAfter) {
      const key = `${segmentBefore}->${segmentAfter}`
      migrations.set(key, (migrations.get(key) || 0) + 1)
    }
  }

  // 세그먼트 변화 데이터 생성
  const segmentChanges: SegmentChangeData[] = SEGMENT_ORDER.map((segmentName) => {
    const countBefore = segmentCountBefore[segmentName] || 0
    const countAfter = segmentCountAfter[segmentName] || 0
    const change = countAfter - countBefore
    const changePercent = countBefore > 0 ? ((change / countBefore) * 100) : (countAfter > 0 ? 100 : 0)
    const isNegativeSegment = NEGATIVE_SEGMENTS.includes(segmentName)

    return {
      segmentName,
      countBefore,
      countAfter,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      isNegativeSegment, // 이탈위험, 이탈은 감소가 좋은 것
    }
  })

  // 세그먼트 이동 데이터 생성 (유효한 이동만 필터링)
  const segmentMigrations: SegmentMigration[] = []

  for (const [key, count] of migrations) {
    const [fromSegment, toSegment] = key.split('->')

    // 유효하지 않은 이동 필터링 (일반→신규, VIP→복귀 등)
    const validTargets = VALID_TRANSITIONS[fromSegment]
    if (!validTargets || !validTargets.includes(toSegment)) {
      continue
    }

    // 긍정/부정 판단
    let isPositive = false

    // 복귀는 항상 긍정적 (이탈/이탈위험에서만 올 수 있음)
    if (toSegment === '복귀') {
      isPositive = true
    }
    // VIP/단골로 이동은 긍정적
    else if (['VIP', '단골'].includes(toSegment)) {
      isPositive = true
    }
    // 이탈위험/이탈에서 벗어남은 긍정적
    else if (NEGATIVE_SEGMENTS.includes(fromSegment) && !NEGATIVE_SEGMENTS.includes(toSegment)) {
      isPositive = true
    }
    // 이탈위험/이탈로 이동은 부정적
    else if (NEGATIVE_SEGMENTS.includes(toSegment)) {
      isPositive = false
    }
    // VIP/단골에서 일반으로 이동은 부정적
    else if (['VIP', '단골'].includes(fromSegment) && toSegment === '일반') {
      isPositive = false
    }

    segmentMigrations.push({
      fromSegment,
      toSegment,
      count,
      isPositive,
    })
  }

  // 이동 건수 순 정렬
  segmentMigrations.sort((a, b) => b.count - a.count)

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
