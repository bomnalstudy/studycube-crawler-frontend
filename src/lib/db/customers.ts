/**
 * 고객 관련 DB 유틸리티
 *
 * 모든 API에서 재사용 가능한 최적화된 쿼리 함수들
 */

import { prisma } from '@/lib/prisma'
import type { DateRange } from './metrics'

export interface CustomerBasicInfo {
  id: string
  firstVisitDate: Date
  lastVisitDate: Date | null
}

export interface CustomerSegmentData {
  customerId: string
  firstVisitDate: Date
  lastVisitDate: Date | null
  recentVisits: number
  previousLastVisit: Date | null
  hasFixedSeat: boolean
}

/**
 * 고객 기본 정보 일괄 조회
 */
export async function getCustomersBasicInfo(
  customerIds: string[]
): Promise<Map<string, CustomerBasicInfo>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      firstVisitDate: true,
      lastVisitDate: true,
    },
  })

  return new Map(customers.map((c) => [c.id, c]))
}

/**
 * 특정 기간 내 신규 고객 수 조회
 */
export async function countNewCustomers(
  phones: string[],
  range: DateRange
): Promise<number> {
  if (phones.length === 0) return 0

  return prisma.customer.count({
    where: {
      phone: { in: phones },
      firstVisitDate: { gte: range.start, lte: range.end },
    },
  })
}

/**
 * 복귀 고객 조회 (특정 기간 이전에 마지막 방문했던 고객)
 */
export async function getReturnedCustomers(
  phones: string[],
  lastVisitBefore: Date
): Promise<string[]> {
  if (phones.length === 0) return []

  const customers = await prisma.customer.findMany({
    where: {
      phone: { in: phones },
      lastVisitDate: { lt: lastVisitBefore },
    },
    select: { id: true },
  })

  return customers.map((c) => c.id)
}

/**
 * 고정석 보유 고객 조회
 */
export async function getCustomersWithFixedSeat(
  branchId: string,
  customerIds: string[]
): Promise<Set<string>> {
  if (customerIds.length === 0) {
    return new Set()
  }

  const purchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      ticketName: { contains: '고정' },
    },
    select: { customerId: true },
    distinct: ['customerId'],
  })

  return new Set(purchases.map((p) => p.customerId))
}

/**
 * 세그먼트 계산을 위한 고객 데이터 일괄 조회
 */
export async function getCustomerSegmentDataBatch(
  branchId: string,
  customerIds: string[],
  range: DateRange,
  previousPeriodStart: Date
): Promise<Map<string, CustomerSegmentData>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  // 병렬로 모든 필요한 데이터 조회
  const [customers, visitCounts, previousVisits, fixedSeatCustomers] = await Promise.all([
    // 1. 고객 기본 정보
    prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, firstVisitDate: true, lastVisitDate: true },
    }),

    // 2. 기간 내 방문 수
    prisma.dailyVisitor.groupBy({
      by: ['customerId'],
      where: {
        branchId,
        customerId: { in: customerIds },
        visitDate: { gte: range.start, lte: range.end },
      },
      _count: { customerId: true },
    }),

    // 3. 기간 이전 마지막 방문일
    prisma.dailyVisitor.findMany({
      where: {
        branchId,
        customerId: { in: customerIds },
        visitDate: { lt: previousPeriodStart },
      },
      select: { customerId: true, visitDate: true },
      orderBy: { visitDate: 'desc' },
    }),

    // 4. 고정석 보유 여부
    prisma.customerPurchase.findMany({
      where: {
        branchId,
        customerId: { in: customerIds },
        ticketName: { contains: '고정' },
      },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
  ])

  // Map으로 변환
  const customerMap = new Map(customers.map((c) => [c.id, c]))
  const visitCountMap = new Map(visitCounts.map((v) => [v.customerId!, v._count.customerId]))
  const fixedSeatSet = new Set(fixedSeatCustomers.map((p) => p.customerId))

  // 이전 방문일은 고객별 첫 번째만 사용
  const previousVisitMap = new Map<string, Date>()
  for (const v of previousVisits) {
    if (v.customerId && !previousVisitMap.has(v.customerId)) {
      previousVisitMap.set(v.customerId, v.visitDate)
    }
  }

  // 결과 조합
  const result = new Map<string, CustomerSegmentData>()

  for (const customerId of customerIds) {
    const customer = customerMap.get(customerId)
    if (!customer) continue

    result.set(customerId, {
      customerId,
      firstVisitDate: customer.firstVisitDate,
      lastVisitDate: customer.lastVisitDate,
      recentVisits: visitCountMap.get(customerId) || 0,
      previousLastVisit: previousVisitMap.get(customerId) || null,
      hasFixedSeat: fixedSeatSet.has(customerId),
    })
  }

  return result
}

/**
 * 이용권 구매 이력 조회 (이전 구매)
 */
export async function getPreviousPurchases(
  branchId: string,
  customerIds: string[],
  beforeDate: Date
): Promise<Map<string, string>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const purchases = await prisma.customerPurchase.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      purchaseDate: { lt: beforeDate },
    },
    select: {
      customerId: true,
      ticketName: true,
      purchaseDate: true,
    },
    orderBy: { purchaseDate: 'desc' },
  })

  // 고객별 가장 최근 구매만
  const result = new Map<string, string>()
  for (const p of purchases) {
    if (!result.has(p.customerId)) {
      result.set(p.customerId, p.ticketName)
    }
  }

  return result
}

/**
 * 기간 내 구매 이력 조회
 */
export async function getPurchasesInRange(
  branchId: string,
  range: DateRange
): Promise<{ customerId: string; ticketName: string }[]> {
  return prisma.customerPurchase.findMany({
    where: {
      branchId,
      purchaseDate: { gte: range.start, lte: range.end },
    },
    select: {
      customerId: true,
      ticketName: true,
    },
    orderBy: { purchaseDate: 'asc' },
  })
}
