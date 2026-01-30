/**
 * 방문자 관련 DB 유틸리티
 *
 * 모든 API에서 재사용 가능한 최적화된 쿼리 함수들
 */

import { prisma } from '@/lib/prisma'
import type { DateRange } from './metrics'

export interface VisitorStats {
  totalVisits: number
  uniqueCustomers: number
}

export interface CustomerVisitInfo {
  customerId: string
  phone: string
  visitCount: number
}

/**
 * 기간 내 방문 수 조회
 */
export async function getVisitCount(
  branchId: string,
  range: DateRange
): Promise<number> {
  return prisma.dailyVisitor.count({
    where: {
      branchId,
      visitDate: { gte: range.start, lte: range.end },
    },
  })
}

/**
 * 여러 지점 방문 수 일괄 조회 (배치)
 */
export async function getVisitCountBatch(
  branchIds: string[],
  range: DateRange
): Promise<Map<string, number>> {
  const counts = await prisma.dailyVisitor.groupBy({
    by: ['branchId'],
    where: {
      branchId: { in: branchIds },
      visitDate: { gte: range.start, lte: range.end },
    },
    _count: { id: true },
  })

  const result = new Map<string, number>()
  for (const branchId of branchIds) {
    result.set(branchId, 0)
  }

  for (const c of counts) {
    result.set(c.branchId, c._count.id)
  }

  return result
}

/**
 * 기간 내 고유 방문 고객 목록 조회
 */
export async function getUniqueVisitors(
  branchId: string,
  range: DateRange
): Promise<{ customerId: string | null; phone: string }[]> {
  return prisma.dailyVisitor.findMany({
    where: {
      branchId,
      visitDate: { gte: range.start, lte: range.end },
    },
    select: { customerId: true, phone: true },
    distinct: ['phone'],
  })
}

/**
 * 여러 지점 고유 방문 고객 목록 일괄 조회 (배치)
 */
export async function getUniqueVisitorsBatch(
  branchIds: string[],
  range: DateRange
): Promise<Map<string, { customerId: string | null; phone: string }[]>> {
  const visitors = await prisma.dailyVisitor.findMany({
    where: {
      branchId: { in: branchIds },
      visitDate: { gte: range.start, lte: range.end },
    },
    select: { branchId: true, customerId: true, phone: true },
    distinct: ['branchId', 'phone'],
  })

  const result = new Map<string, { customerId: string | null; phone: string }[]>()
  for (const branchId of branchIds) {
    result.set(branchId, [])
  }

  for (const v of visitors) {
    result.get(v.branchId)!.push({ customerId: v.customerId, phone: v.phone })
  }

  return result
}

/**
 * 고객별 방문 수 조회 (groupBy 사용)
 */
export async function getCustomerVisitCounts(
  branchId: string,
  customerIds: string[],
  range: DateRange
): Promise<Map<string, number>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const counts = await prisma.dailyVisitor.groupBy({
    by: ['customerId'],
    where: {
      branchId,
      customerId: { in: customerIds },
      visitDate: { gte: range.start, lte: range.end },
    },
    _count: { customerId: true },
  })

  const result = new Map<string, number>()
  for (const c of counts) {
    if (c.customerId) {
      result.set(c.customerId, c._count.customerId)
    }
  }

  return result
}

/**
 * 고객들의 마지막 방문일 조회 (특정 날짜 이전)
 */
export async function getLastVisitDates(
  branchId: string,
  customerIds: string[],
  beforeDate: Date
): Promise<Map<string, Date>> {
  if (customerIds.length === 0) {
    return new Map()
  }

  const visits = await prisma.dailyVisitor.findMany({
    where: {
      branchId,
      customerId: { in: customerIds },
      visitDate: { lt: beforeDate },
    },
    select: { customerId: true, visitDate: true },
    orderBy: { visitDate: 'desc' },
  })

  const result = new Map<string, Date>()
  for (const v of visits) {
    if (v.customerId && !result.has(v.customerId)) {
      result.set(v.customerId, v.visitDate)
    }
  }

  return result
}

/**
 * 시간대별 이용자 수 조회
 */
export async function getHourlyUsage(
  branchId: string,
  range: DateRange
): Promise<Map<number, number>> {
  const usage = await prisma.hourlyUsage.findMany({
    where: {
      branchId,
      date: { gte: range.start, lte: range.end },
    },
    select: { hour: true, usageCount: true },
  })

  const result = new Map<number, number>()
  for (const u of usage) {
    result.set(u.hour, (result.get(u.hour) || 0) + (u.usageCount || 0))
  }

  return result
}

/**
 * 여러 지점 시간대별 이용자 수 일괄 조회 (배치)
 */
export async function getHourlyUsageBatch(
  branchIds: string[],
  range: DateRange
): Promise<Map<string, Map<number, number>>> {
  const usage = await prisma.hourlyUsage.findMany({
    where: {
      branchId: { in: branchIds },
      date: { gte: range.start, lte: range.end },
    },
    select: { branchId: true, hour: true, usageCount: true },
  })

  const result = new Map<string, Map<number, number>>()
  for (const branchId of branchIds) {
    result.set(branchId, new Map())
  }

  for (const u of usage) {
    const branchMap = result.get(u.branchId)!
    branchMap.set(u.hour, (branchMap.get(u.hour) || 0) + (u.usageCount || 0))
  }

  return result
}

/**
 * 피크 시간대 찾기
 */
export function findPeakHour(hourlyUsage: Map<number, number>): number {
  let peakHour = 14
  let maxUsage = 0

  for (const [hour, usage] of hourlyUsage) {
    if (usage > maxUsage) {
      maxUsage = usage
      peakHour = hour
    }
  }

  return peakHour
}

/**
 * 방문 통계 비교 (두 기간)
 */
export async function compareVisitorStats(
  branchId: string,
  currentRange: DateRange,
  previousRange: DateRange
): Promise<{
  current: VisitorStats
  previous: VisitorStats
  growth: number
}> {
  const [currentCount, previousCount, currentUnique, previousUnique] = await Promise.all([
    getVisitCount(branchId, currentRange),
    getVisitCount(branchId, previousRange),
    getUniqueVisitors(branchId, currentRange),
    getUniqueVisitors(branchId, previousRange),
  ])

  const growth = previousCount === 0
    ? (currentCount > 0 ? 100 : 0)
    : ((currentCount - previousCount) / previousCount) * 100

  return {
    current: { totalVisits: currentCount, uniqueCustomers: currentUnique.length },
    previous: { totalVisits: previousCount, uniqueCustomers: previousUnique.length },
    growth,
  }
}
