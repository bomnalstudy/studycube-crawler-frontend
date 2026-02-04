import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment } from '@/lib/crm/segment-calculator'
import { VisitSegment, TicketSegment, VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS } from '@/types/crm'

export interface MonthlyRevenue {
  month: string // YYYY-MM
  totalRevenue: number
  dayTicketRevenue: number
  timeTicketRevenue: number
  termTicketRevenue: number
  lockerRevenue: number
  newUsers: number
  days: number
}

export interface BranchMonthlyData {
  branchName: string
  months: MonthlyRevenue[]
}

export interface AnalyticsData {
  branchName: string
  totalMonthly: MonthlyRevenue[]
  branchMonthly: BranchMonthlyData[]
  customers: {
    total: number
    visitSegments: Array<{ segment: string; count: number }>
    ticketSegments: Array<{ segment: string; count: number }>
  }
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function createEmptyMonth(month: string): MonthlyRevenue {
  return {
    month, totalRevenue: 0, dayTicketRevenue: 0, timeTicketRevenue: 0,
    termTicketRevenue: 0, lockerRevenue: 0, newUsers: 0, days: 0,
  }
}

function addToMonth(target: MonthlyRevenue, m: {
  totalRevenue: unknown; dayTicketRevenue: unknown; timeTicketRevenue: unknown
  termTicketRevenue: unknown; lockerRevenue: unknown; newUsers: number | null
}) {
  target.totalRevenue += decimalToNumber(m.totalRevenue)
  target.dayTicketRevenue += decimalToNumber(m.dayTicketRevenue)
  target.timeTicketRevenue += decimalToNumber(m.timeTicketRevenue)
  target.termTicketRevenue += decimalToNumber(m.termTicketRevenue)
  target.lockerRevenue += decimalToNumber(m.lockerRevenue)
  target.newUsers += m.newUsers || 0
  target.days++
}

/**
 * AI에 제공할 분석 데이터 조회
 * - 전체 기간 월별 매출 집계 (전체 합산 + 지점별)
 * - 현재 고객 세그먼트 현황
 */
export async function fetchAnalyticsData(
  session: Session,
  branchId?: string
): Promise<AnalyticsData> {
  const requestedBranchId = branchId || 'all'
  const branchFilter = getBranchFilter(session, requestedBranchId)
  const thirtyDaysAgo = kstStartOfDay(getKSTDaysAgoStr(30))

  const [branches, allMetrics, allCustomers, recentVisitors] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, name: true } }),
    // 전체 기간 매출 데이터
    prisma.dailyMetric.findMany({
      where: branchFilter,
      select: {
        date: true, branchId: true,
        totalRevenue: true, dayTicketRevenue: true,
        timeTicketRevenue: true, termTicketRevenue: true,
        lockerRevenue: true, newUsers: true,
      },
    }),
    // 전체 고객
    prisma.customer.findMany({
      where: branchFilter.branchId ? { mainBranchId: branchFilter.branchId } : {},
      select: {
        id: true, phone: true, firstVisitDate: true,
        lastVisitDate: true, totalVisits: true, totalSpent: true,
      },
    }),
    // 최근 30일 방문자 (세그먼트 계산용)
    prisma.dailyVisitor.findMany({
      where: { ...branchFilter, visitDate: { gte: thirtyDaysAgo } },
      select: {
        phone: true, customerId: true, visitDate: true,
        remainingTermTicket: true, remainingTimePackage: true, remainingFixedSeat: true,
      },
    }),
  ])

  const branchNameMap = new Map(branches.map(b => [b.id, b.name]))
  const branchName = branchFilter.branchId
    ? branchNameMap.get(branchFilter.branchId) || '알 수 없음'
    : '전체 지점'

  // === 월별 매출 집계 ===
  const totalByMonth = new Map<string, MonthlyRevenue>()
  const branchByMonth = new Map<string, Map<string, MonthlyRevenue>>()

  for (const m of allMetrics) {
    const monthKey = getMonthKey(m.date)
    const bName = branchNameMap.get(m.branchId) || m.branchId

    // 전체 합산
    if (!totalByMonth.has(monthKey)) {
      totalByMonth.set(monthKey, createEmptyMonth(monthKey))
    }
    addToMonth(totalByMonth.get(monthKey)!, m)

    // 지점별
    if (!branchByMonth.has(bName)) {
      branchByMonth.set(bName, new Map())
    }
    const bMap = branchByMonth.get(bName)!
    if (!bMap.has(monthKey)) {
      bMap.set(monthKey, createEmptyMonth(monthKey))
    }
    addToMonth(bMap.get(monthKey)!, m)
  }

  const totalMonthly = [...totalByMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  const branchMonthly: BranchMonthlyData[] = [...branchByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, monthMap]) => ({
      branchName: name,
      months: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    }))

  // === 고객 세그먼트 계산 ===
  const customers = calculateCustomerSegments(allCustomers, recentVisitors, thirtyDaysAgo)

  return { branchName, totalMonthly, branchMonthly, customers }
}

/**
 * 고객 세그먼트 집계
 */
function calculateCustomerSegments(
  allCustomers: Array<{
    id: string; phone: string; firstVisitDate: Date | null
    lastVisitDate: Date | null; totalVisits: number; totalSpent: unknown
  }>,
  recentVisitors: Array<{
    phone: string; customerId: string | null; visitDate: Date
    remainingTermTicket: string | null; remainingTimePackage: string | null
    remainingFixedSeat: string | null
  }>,
  thirtyDaysAgo: Date,
) {
  const now = new Date()
  const phoneToCustomerId = new Map<string, string>()
  allCustomers.forEach(c => phoneToCustomerId.set(c.phone, c.id))

  const customerVisitDates = new Map<string, Set<string>>()
  const customerLatestVisit = new Map<string, {
    remainingTermTicket: string | null
    remainingTimePackage: string | null
    remainingFixedSeat: string | null
  }>()

  recentVisitors.forEach(v => {
    const custId = v.customerId || phoneToCustomerId.get(v.phone)
    if (!custId) return
    const dateStr = v.visitDate.toISOString().split('T')[0]
    if (!customerVisitDates.has(custId)) customerVisitDates.set(custId, new Set())
    customerVisitDates.get(custId)!.add(dateStr)

    if (!customerLatestVisit.has(custId)) {
      customerLatestVisit.set(custId, {
        remainingTermTicket: v.remainingTermTicket,
        remainingTimePackage: v.remainingTimePackage,
        remainingFixedSeat: v.remainingFixedSeat,
      })
    }
  })

  const visitSegmentCounts: Record<VisitSegment, number> = {
    churned: 0, at_risk_14: 0, returned: 0, new_0_7: 0,
    visit_under10: 0, visit_10_20: 0, visit_over20: 0,
  }
  const ticketSegmentCounts: Record<TicketSegment, number> = {
    day_ticket: 0, time_ticket: 0, term_ticket: 0, fixed_ticket: 0,
  }

  allCustomers.forEach(customer => {
    const recentVisits = customerVisitDates.get(customer.id)?.size || 0
    const remaining = customerLatestVisit.get(customer.id)

    const visitSeg = calculateVisitSegment({
      lastVisitDate: customer.lastVisitDate,
      firstVisitDate: customer.firstVisitDate ?? new Date(),
      recentVisits,
      referenceDate: now,
      rangeStart: thirtyDaysAgo,
      previousLastVisitDate: null,
      hasRemainingFixedSeat: !!(remaining?.remainingFixedSeat?.trim()),
    })
    const ticketSeg = calculateTicketSegment({
      hasRemainingTermTicket: !!(remaining?.remainingTermTicket?.trim()),
      hasRemainingTimePackage: !!(remaining?.remainingTimePackage?.trim()),
      hasRemainingFixedSeat: !!(remaining?.remainingFixedSeat?.trim()),
    })

    visitSegmentCounts[visitSeg]++
    ticketSegmentCounts[ticketSeg]++
  })

  return {
    total: allCustomers.length,
    visitSegments: Object.entries(visitSegmentCounts).map(([seg, count]) => ({
      segment: VISIT_SEGMENT_LABELS[seg as VisitSegment],
      count,
    })),
    ticketSegments: Object.entries(ticketSegmentCounts).map(([seg, count]) => ({
      segment: TICKET_SEGMENT_LABELS[seg as TicketSegment],
      count,
    })),
  }
}
