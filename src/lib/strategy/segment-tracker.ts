import { prisma } from '@/lib/prisma'
import { calculateVisitSegment } from '@/lib/crm/segment-calculator'
import type { SegmentChangeData, SegmentMigration } from '@/types/strategy'

// 세그먼트 코드 → 표시 이름 매핑
const SEGMENT_NAMES: Record<string, string> = {
  visit_over20: 'VIP',
  visit_10_20: '단골',
  visit_under10: '일반',
  at_risk_14: '이탈위험',
  churned: '휴면',
  new_0_7: '신규',
  returned: '복귀',
}

// 세그먼트 우선순위 (긍정적 순서)
const SEGMENT_ORDER = ['VIP', '단골', '일반', '신규', '복귀', '이탈위험', '휴면']

/**
 * 특정 날짜 기준 고객의 세그먼트 계산
 */
async function getCustomerSegmentAtDate(
  customerId: string,
  branchId: string,
  referenceDate: Date,
  rangeStart: Date
): Promise<string> {
  // 해당 기간 내 방문 수
  const recentVisits = await prisma.dailyVisitor.count({
    where: {
      customerId,
      branchId,
      visitDate: { gte: rangeStart, lte: referenceDate },
    },
  })

  // 고객 정보
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      firstVisitDate: true,
      lastVisitDate: true,
    },
  })

  if (!customer) return '일반'

  // 기간 시작 이전 마지막 방문일
  const previousVisit = await prisma.dailyVisitor.findFirst({
    where: {
      customerId,
      branchId,
      visitDate: { lt: rangeStart },
    },
    orderBy: { visitDate: 'desc' },
    select: { visitDate: true },
  })

  // 잔여 이용권 확인 (고정석/기간권)
  const remainingTickets = await prisma.customerPurchase.findFirst({
    where: {
      customerId,
      branchId,
      purchaseDate: { lte: referenceDate },
      ticketName: {
        contains: '고정',
      },
    },
    orderBy: { purchaseDate: 'desc' },
  })

  const hasRemainingFixedSeat = !!remainingTickets

  // 세그먼트 계산
  const segment = calculateVisitSegment({
    lastVisitDate: customer.lastVisitDate,
    firstVisitDate: customer.firstVisitDate,
    recentVisits,
    referenceDate,
    rangeStart,
    previousLastVisitDate: previousVisit?.visitDate ?? null,
    hasRemainingFixedSeat,
    hasRemainingTermTicket: false, // 간소화
  })

  return SEGMENT_NAMES[segment] || '일반'
}

/**
 * 이벤트 기간 전후의 세그먼트 변화 추적
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

  // 관련 고객 목록 (이벤트 전후 기간에 방문한 고객)
  const relevantVisitors = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { gte: beforeStart, lte: afterEnd },
    },
    select: { customerId: true },
    distinct: ['customerId'],
  })

  const customerIds = relevantVisitors
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
      })),
      segmentMigrations: [],
    }
  }

  // 제한된 고객 수만 처리 (성능)
  const sampleSize = Math.min(customerIds.length, 500)
  const sampledIds = customerIds.slice(0, sampleSize)

  // 각 고객의 전후 세그먼트 계산
  const migrations: Map<string, number> = new Map()
  const segmentCountBefore: Record<string, number> = {}
  const segmentCountAfter: Record<string, number> = {}

  for (const segment of SEGMENT_ORDER) {
    segmentCountBefore[segment] = 0
    segmentCountAfter[segment] = 0
  }

  for (const customerId of sampledIds) {
    // 이벤트 전 세그먼트
    const segmentBefore = await getCustomerSegmentAtDate(
      customerId,
      branchId,
      beforeEnd,
      beforeStart
    )

    // 이벤트 후 세그먼트
    const segmentAfter = await getCustomerSegmentAtDate(
      customerId,
      branchId,
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

    return {
      segmentName,
      countBefore,
      countAfter,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
    }
  })

  // 세그먼트 이동 데이터 생성
  const segmentMigrations: SegmentMigration[] = []

  for (const [key, count] of migrations) {
    const [fromSegment, toSegment] = key.split('->')

    // 긍정/부정 판단
    // 긍정: VIP/단골로 이동, 이탈위험/휴면에서 벗어남
    // 부정: 이탈위험/휴면으로 이동
    let isPositive = false

    if (['VIP', '단골'].includes(toSegment)) {
      isPositive = true
    } else if (['이탈위험', '휴면'].includes(fromSegment) && ['일반', '단골', 'VIP', '신규', '복귀'].includes(toSegment)) {
      isPositive = true
    } else if (['이탈위험', '휴면'].includes(toSegment)) {
      isPositive = false
    } else if (['VIP', '단골'].includes(fromSegment) && ['일반', '이탈위험', '휴면'].includes(toSegment)) {
      isPositive = false
    } else {
      // 기타 (일반→신규, 복귀→일반 등)은 중립
      isPositive = SEGMENT_ORDER.indexOf(toSegment) < SEGMENT_ORDER.indexOf(fromSegment)
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
 * 이용권 업그레이드 추적
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

  // 각 고객의 이전 구매 이력 확인
  const upgrades: Map<string, number> = new Map()
  const processedCustomers = new Set<string>()

  const ticketOrder = ['당일권', '시간권', '기간권', '고정석']

  for (const purchase of eventPurchases) {
    if (processedCustomers.has(purchase.customerId)) continue
    processedCustomers.add(purchase.customerId)

    // 이전 구매 이력
    const previousPurchase = await prisma.customerPurchase.findFirst({
      where: {
        customerId: purchase.customerId,
        branchId,
        purchaseDate: { lt: eventStart },
      },
      orderBy: { purchaseDate: 'desc' },
      select: { ticketName: true },
    })

    if (!previousPurchase) continue

    // 이용권 타입 추출
    const prevType = inferTicketTypeSimple(previousPurchase.ticketName)
    const currType = inferTicketTypeSimple(purchase.ticketName)

    // 업그레이드 확인
    if (ticketOrder.indexOf(currType) > ticketOrder.indexOf(prevType)) {
      const key = `${prevType}->${currType}`
      upgrades.set(key, (upgrades.get(key) || 0) + 1)
    }
  }

  // 업그레이드 데이터 생성
  const result: { fromTicket: string; toTicket: string; count: number; upgradeRate: number }[] = []

  for (const [key, count] of upgrades) {
    const [fromTicket, toTicket] = key.split('->')

    // 해당 이용권 사용자 중 업그레이드 비율
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
