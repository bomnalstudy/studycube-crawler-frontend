import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, kstEndOfDay, getKSTYesterdayStr, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment, calculateFavoriteTicketType, inferTicketType } from '@/lib/crm/segment-calculator'
import {
  CrmDashboardData, VisitSegment, TicketSegment,
  OperationQueueItem, SegmentChartItem,
  VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS,
} from '@/types/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedBranchId = searchParams.get('branchId') || 'all'
    const branchFilter = getBranchFilter(session, requestedBranchId)

    // 기간 파라미터 (없으면 최근 30일) — KST 기준
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const yesterdayStr = getKSTYesterdayStr()
    const yesterday = kstEndOfDay(yesterdayStr)
    const rangeStart = startDateParam ? kstStartOfDay(startDateParam) : kstStartOfDay(getKSTDaysAgoStr(30))
    const rangeEndRaw = endDateParam ? kstEndOfDay(endDateParam) : yesterday
    const rangeEnd = rangeEndRaw > yesterday ? yesterday : rangeEndRaw

    // 병렬 쿼리 (필요한 필드만 select하여 데이터 전송 최소화)
    const [
      allCustomers,
      recentVisitors,
      recentPurchases,
      preRangeLastVisits,
    ] = await Promise.all([
      // 전체 고객
      prisma.customer.findMany({
        where: branchFilter.branchId ? { mainBranchId: branchFilter.branchId } : {},
        select: {
          id: true,
          phone: true,
          firstVisitDate: true,
          lastVisitDate: true,
          totalVisits: true,
          totalSpent: true,
        }
      }),
      // 기간 내 방문자 (phone 기반으로 매칭)
      prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          phone: true,
          customerId: true,
          visitDate: true,
          remainingTermTicket: true,
          remainingTimePackage: true,
          remainingFixedSeat: true,
        }
      }),
      // 기간 내 구매 (이용권 타입 분류용)
      prisma.customerPurchase.findMany({
        where: {
          ...branchFilter,
          purchaseDate: { gte: rangeStart, lte: rangeEnd },
        },
        select: {
          customerId: true,
          ticketName: true,
          amount: true,
        }
      }),
      // 기간 시작 전 고객별 마지막 방문일 (DB에서 그룹핑하여 성능 최적화)
      // 원래: 모든 이전 방문을 가져와 메모리에서 그룹핑 → 변경: DB에서 groupBy로 집계
      prisma.dailyVisitor.groupBy({
        by: ['customerId'],
        where: {
          ...branchFilter,
          visitDate: { lt: rangeStart },
          customerId: { not: null },
        },
        _max: { visitDate: true },
      }),
    ])

    // phone -> customerId 매핑 테이블
    const phoneToCustomerId = new Map<string, string>()
    allCustomers.forEach(c => {
      phoneToCustomerId.set(c.phone, c.id)
    })

    // 30일 내 방문 수 계산 (phone 기반 매칭, 고객별 서로 다른 날짜 수)
    const customerVisitDates = new Map<string, Set<string>>()
    const customerLatestVisit = new Map<string, {
      phone: string
      customerId: string | null
      visitDate: Date
      remainingTermTicket: string | null
      remainingTimePackage: string | null
      remainingFixedSeat: string | null
    }>()

    recentVisitors.forEach(v => {
      // customerId가 있으면 사용, 없으면 phone으로 매칭
      const custId = v.customerId || phoneToCustomerId.get(v.phone)
      if (!custId) return
      const dateStr = v.visitDate.toISOString().split('T')[0]
      if (!customerVisitDates.has(custId)) {
        customerVisitDates.set(custId, new Set())
      }
      customerVisitDates.get(custId)!.add(dateStr)

      // 가장 최근 방문 기록 저장 (잔여 이용권 확인용)
      const existing = customerLatestVisit.get(custId)
      if (!existing || v.visitDate > existing.visitDate) {
        customerLatestVisit.set(custId, v)
      }
    })

    const customerRecentVisits = new Map<string, number>()
    customerVisitDates.forEach((dates, customerId) => {
      customerRecentVisits.set(customerId, dates.size)
    })

    // 고객별 잔여 이용권 종류별 확인
    // [대시보드용] 선택 기간 내 최신 방문 기록의 잔여 이용권 사용
    // → 해당 기간 동안 어떤 이용권을 보유했는지 분석 (기간 기반)
    // 고객 리스트/자동화에서는 전체 최신 방문 기준으로 현재 보유 이용권 확인
    const customerRemainingTickets = new Map<string, {
      hasTermTicket: boolean
      hasTimePackage: boolean
      hasFixedSeat: boolean
    }>()
    customerLatestVisit.forEach((visit, customerId) => {
      customerRemainingTickets.set(customerId, {
        hasTermTicket: !!(visit.remainingTermTicket && visit.remainingTermTicket.trim() !== ''),
        hasTimePackage: !!(visit.remainingTimePackage && visit.remainingTimePackage.trim() !== ''),
        hasFixedSeat: !!(visit.remainingFixedSeat && visit.remainingFixedSeat.trim() !== ''),
      })
    })

    // 기간 시작 전 고객별 마지막 방문일 (복귀 판별용) - groupBy 결과를 Map으로 변환
    const preRangeLastVisit = new Map<string, Date>()
    for (const v of preRangeLastVisits) {
      if (v.customerId && v._max.visitDate) {
        preRangeLastVisit.set(v.customerId, v._max.visitDate)
      }
    }

    // 고객별 구매 데이터
    const customerPurchases = new Map<string, { ticketName: string; amount: number }[]>()
    const customerPeriodSpent = new Map<string, number>()
    recentPurchases.forEach(p => {
      if (!customerPurchases.has(p.customerId)) {
        customerPurchases.set(p.customerId, [])
      }
      const amount = decimalToNumber(p.amount)
      customerPurchases.get(p.customerId)!.push({
        ticketName: p.ticketName,
        amount,
      })
      customerPeriodSpent.set(p.customerId, (customerPeriodSpent.get(p.customerId) || 0) + amount)
    })

    // 재방문률 계산용 기간 일수 (루프 전에 계산 필요)
    const dayMs = 24 * 60 * 60 * 1000
    const periodDays = rangeEndRaw > yesterday
      ? 30
      : Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / dayMs) + 1

    // 세그먼트 분류 + LTV/재방문률 계산 (한 번의 루프로 처리)
    const visitSegmentMap = new Map<string, VisitSegment>()
    const ticketSegmentMap = new Map<string, TicketSegment>()

    const visitSegmentCounts: Record<VisitSegment, number> = {
      churned: 0, at_risk_14: 0, returned: 0, new_0_7: 0,
      visit_under10: 0, visit_10_20: 0, visit_over20: 0,
    }
    const ticketSegmentCounts: Record<TicketSegment, number> = {
      day_ticket: 0, time_ticket: 0, term_ticket: 0, fixed_ticket: 0,
    }

    // LTV 및 재방문률 집계용
    const visitSpentTotals: Record<VisitSegment, { total: number; count: number }> = {
      churned: { total: 0, count: 0 }, at_risk_14: { total: 0, count: 0 },
      returned: { total: 0, count: 0 }, new_0_7: { total: 0, count: 0 },
      visit_under10: { total: 0, count: 0 }, visit_10_20: { total: 0, count: 0 },
      visit_over20: { total: 0, count: 0 },
    }
    const visitRevisitTotals: Record<VisitSegment, { totalRate: number; count: number }> = {
      churned: { totalRate: 0, count: 0 }, at_risk_14: { totalRate: 0, count: 0 },
      returned: { totalRate: 0, count: 0 }, new_0_7: { totalRate: 0, count: 0 },
      visit_under10: { totalRate: 0, count: 0 }, visit_10_20: { totalRate: 0, count: 0 },
      visit_over20: { totalRate: 0, count: 0 },
    }
    const ticketSpentTotals: Record<TicketSegment, { total: number; count: number }> = {
      day_ticket: { total: 0, count: 0 }, time_ticket: { total: 0, count: 0 },
      term_ticket: { total: 0, count: 0 }, fixed_ticket: { total: 0, count: 0 },
    }
    const ticketRevisitTotals: Record<TicketSegment, { totalRate: number; count: number }> = {
      day_ticket: { totalRate: 0, count: 0 }, time_ticket: { totalRate: 0, count: 0 },
      term_ticket: { totalRate: 0, count: 0 }, fixed_ticket: { totalRate: 0, count: 0 },
    }

    // 신규/일반 고객 재방문률 집계
    let generalRevisitSum = 0
    let generalCount = 0
    let newRevisitSum = 0
    let newCount = 0

    allCustomers.forEach(customer => {
      const recentVisits = customerRecentVisits.get(customer.id) || 0
      const remaining = customerRemainingTickets.get(customer.id)
      const spent = decimalToNumber(customer.totalSpent)
      const visitDays = recentVisits
      const customerRate = visitDays / periodDays

      const visitSeg = calculateVisitSegment({
        lastVisitDate: customer.lastVisitDate,
        firstVisitDate: customer.firstVisitDate,
        recentVisits,
        referenceDate: rangeEnd,
        rangeStart,
        previousLastVisitDate: preRangeLastVisit.get(customer.id) || null,
        hasRemainingFixedSeat: remaining?.hasFixedSeat || false,
      })
      const ticketSeg = calculateTicketSegment({
        hasRemainingTermTicket: remaining?.hasTermTicket || false,
        hasRemainingTimePackage: remaining?.hasTimePackage || false,
        hasRemainingFixedSeat: remaining?.hasFixedSeat || false,
      })

      visitSegmentMap.set(customer.id, visitSeg)
      ticketSegmentMap.set(customer.id, ticketSeg)
      visitSegmentCounts[visitSeg]++
      ticketSegmentCounts[ticketSeg]++

      // LTV 집계
      visitSpentTotals[visitSeg].total += spent
      visitSpentTotals[visitSeg].count++
      visitRevisitTotals[visitSeg].count++
      visitRevisitTotals[visitSeg].totalRate += customerRate
      ticketSpentTotals[ticketSeg].total += spent
      ticketSpentTotals[ticketSeg].count++
      ticketRevisitTotals[ticketSeg].count++
      ticketRevisitTotals[ticketSeg].totalRate += customerRate

      // 신규/일반 재방문률 집계
      if (customer.firstVisitDate >= rangeStart && customer.firstVisitDate <= rangeEnd) {
        newRevisitSum += customerRate
        newCount++
      } else if (customer.firstVisitDate < rangeStart) {
        generalRevisitSum += customerRate
        generalCount++
      }
    })

    // 운영 큐: 기간 내 방문/구매 기반 매핑 (신규/당일권용)
    const toQueueItem = (c: typeof allCustomers[number]): OperationQueueItem => ({
      customerId: c.id,
      phone: c.phone,
      lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
      totalVisits: customerRecentVisits.get(c.id) || 0,
      totalSpent: customerPeriodSpent.get(c.id) || 0,
      visitSegment: visitSegmentMap.get(c.id)!,
      ticketSegment: ticketSegmentMap.get(c.id)!,
    })

    // 운영 큐: 전체 누적 기반 매핑 (이탈위험용)
    const toQueueItemAllTime = (c: typeof allCustomers[number]): OperationQueueItem => ({
      customerId: c.id,
      phone: c.phone,
      lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
      totalVisits: c.totalVisits,
      totalSpent: decimalToNumber(c.totalSpent),
      visitSegment: visitSegmentMap.get(c.id)!,
      ticketSegment: ticketSegmentMap.get(c.id)!,
    })

    // 정렬: 소비금액 높은 순 → 방문횟수 높은 순
    const sortBySpentAndVisits = (a: OperationQueueItem, b: OperationQueueItem) =>
      b.totalSpent - a.totalSpent || b.totalVisits - a.totalVisits

    // 운영 큐 크기 제한 없음
    const QUEUE_LIMIT = Infinity

    // 당일권 구매자 ID Set (미리 계산)
    const dayTicketCustomerIds = new Set(
      recentPurchases
        .filter(p => decimalToNumber(p.amount) > 0 && inferTicketType(p.ticketName) === 'day')
        .map(p => p.customerId)
    )

    // 운영 큐 데이터 수집 (한 번의 순회로 처리)
    const atRiskRaw: OperationQueueItem[] = []
    const returnedRaw: OperationQueueItem[] = []
    const newSignupsRaw: OperationQueueItem[] = []
    const dayTicketRaw: OperationQueueItem[] = []

    allCustomers.forEach(c => {
      const vSeg = visitSegmentMap.get(c.id)!
      const tSeg = ticketSegmentMap.get(c.id)!

      if (vSeg === 'at_risk_14') {
        atRiskRaw.push(toQueueItemAllTime(c))
      } else if (vSeg === 'returned') {
        returnedRaw.push(toQueueItemAllTime(c))
      } else if (vSeg === 'new_0_7') {
        newSignupsRaw.push(toQueueItem(c))
      }

      if (tSeg === 'day_ticket' && dayTicketCustomerIds.has(c.id)) {
        dayTicketRaw.push(toQueueItem(c))
      }
    })

    // 정렬 및 크기 제한
    const atRiskList = atRiskRaw.sort(sortBySpentAndVisits).slice(0, QUEUE_LIMIT)
    const returnedList = returnedRaw.sort(sortBySpentAndVisits).slice(0, QUEUE_LIMIT)
    const newSignupsList = newSignupsRaw.sort(sortBySpentAndVisits).slice(0, QUEUE_LIMIT)
    const dayTicketRepeaters = dayTicketRaw.sort(sortBySpentAndVisits).slice(0, QUEUE_LIMIT)

    // KPI 계산 (이미 위 루프에서 집계됨)
    const totalCustomers = allCustomers.length
    const newCustomers = newCount
    const atRiskCustomers = visitSegmentCounts.at_risk_14
    const churnedCustomers = visitSegmentCounts.churned
    const timeTicketCustomers = ticketSegmentCounts.time_ticket
    const termTicketCustomers = ticketSegmentCounts.term_ticket
    const fixedTicketCustomers = ticketSegmentCounts.fixed_ticket

    // 재방문률 계산 (이미 위 루프에서 집계됨)
    const generalRevisitRate = generalCount > 0 ? (generalRevisitSum / generalCount) * 100 : 0
    const newRevisitRate = newCount > 0 ? (newRevisitSum / newCount) * 100 : 0

    const visitSegmentLtv: SegmentChartItem[] = (Object.entries(visitSpentTotals) as [VisitSegment, { total: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: VISIT_SEGMENT_LABELS[seg], value: Math.round(v.total / v.count) }))
      .sort((a, b) => b.value - a.value)

    const visitSegmentRevisitRate: SegmentChartItem[] = (Object.entries(visitRevisitTotals) as [VisitSegment, { totalRate: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: VISIT_SEGMENT_LABELS[seg], value: Math.round((v.totalRate / v.count) * 100) }))
      .sort((a, b) => b.value - a.value)

    const ticketSegmentLtv: SegmentChartItem[] = (Object.entries(ticketSpentTotals) as [TicketSegment, { total: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: TICKET_SEGMENT_LABELS[seg], value: Math.round(v.total / v.count) }))
      .sort((a, b) => b.value - a.value)

    const ticketSegmentRevisitRate: SegmentChartItem[] = (Object.entries(ticketRevisitTotals) as [TicketSegment, { totalRate: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: TICKET_SEGMENT_LABELS[seg], value: Math.round((v.totalRate / v.count) * 100) }))
      .sort((a, b) => b.value - a.value)

    // 세그먼트별 고객 수 (차트용)
    const visitCountsChart: SegmentChartItem[] = (Object.entries(visitSegmentCounts) as [VisitSegment, number][])
      .filter(([, count]) => count > 0)
      .map(([seg, count]) => ({ segment: seg, label: VISIT_SEGMENT_LABELS[seg], value: count }))
      .sort((a, b) => b.value - a.value)

    const ticketCountsChart: SegmentChartItem[] = (Object.entries(ticketSegmentCounts) as [TicketSegment, number][])
      .filter(([, count]) => count > 0)
      .map(([seg, count]) => ({ segment: seg, label: TICKET_SEGMENT_LABELS[seg], value: count }))
      .sort((a, b) => b.value - a.value)

    const data: CrmDashboardData = {
      kpi: {
        totalCustomers,
        newCustomers,
        atRiskCustomers,
        churnedCustomers,
        timeTicketCustomers,
        termTicketCustomers,
        fixedTicketCustomers,
      },
      revisitRatios: {
        generalRevisitRate: Math.round(generalRevisitRate * 10) / 10,
        newRevisitRate: Math.round(newRevisitRate * 10) / 10,
      },
      operationQueue: {
        atRisk: atRiskList,
        returned: returnedList,
        newSignups: newSignupsList,
        dayTicketRepeaters,
      },
      visitSegmentCounts: visitCountsChart,
      visitSegmentLtv,
      visitSegmentRevisitRate,
      ticketSegmentCounts: ticketCountsChart,
      ticketSegmentLtv,
      ticketSegmentRevisitRate,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch CRM dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CRM dashboard' },
      { status: 500 }
    )
  }
}
