import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { calculateVisitSegment, calculateTicketSegment, calculateFavoriteTicketType, inferTicketType } from '@/lib/crm/segment-calculator'
import {
  CrmDashboardData, VisitSegment, TicketSegment,
  OperationQueueItem, SegmentChartItem,
  VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS,
} from '@/types/crm'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedBranchId = searchParams.get('branchId') || 'all'
    const branchFilter = getBranchFilter(session, requestedBranchId)

    const now = new Date()

    // 기간 파라미터 (없으면 최근 30일)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const rangeStart = startDateParam ? new Date(startDateParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    // 데이터는 전날까지만 존재하므로 기준점은 어제
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)
    const rangeEndRaw = endDateParam ? new Date(endDateParam + 'T23:59:59') : yesterday
    const rangeEnd = rangeEndRaw > yesterday ? yesterday : rangeEndRaw

    // 병렬 쿼리
    const [
      allCustomers,
      recentVisitors,
      recentPurchases,
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

    // 세그먼트 분류 (방문 + 이용권 독립 분류)
    const visitSegmentMap = new Map<string, VisitSegment>()
    const ticketSegmentMap = new Map<string, TicketSegment>()

    const visitSegmentCounts: Record<VisitSegment, number> = {
      churned: 0, at_risk_7: 0, new_0_7: 0,
      visit_under10: 0, visit_10_20: 0, visit_over20: 0,
    }
    const ticketSegmentCounts: Record<TicketSegment, number> = {
      day_ticket: 0, time_ticket: 0, term_ticket: 0, fixed_ticket: 0,
    }

    allCustomers.forEach(customer => {
      const recentVisits = customerRecentVisits.get(customer.id) || 0
      const remaining = customerRemainingTickets.get(customer.id)

      const visitSeg = calculateVisitSegment({
        lastVisitDate: customer.lastVisitDate,
        firstVisitDate: customer.firstVisitDate,
        recentVisits,
        referenceDate: rangeEnd,
        rangeStart,
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
    })

    // KPI
    const totalCustomers = allCustomers.length
    const newCustomers = allCustomers.filter(c =>
      c.firstVisitDate >= rangeStart && c.firstVisitDate <= rangeEnd
    ).length
    const atRiskCustomers = visitSegmentCounts.at_risk_7
    const churnedCustomers = visitSegmentCounts.churned
    const timeTicketCustomers = ticketSegmentCounts.time_ticket
    const termTicketCustomers = ticketSegmentCounts.term_ticket
    const fixedTicketCustomers = ticketSegmentCounts.fixed_ticket

    // 재방문 비율 계산
    const nonNewCustomers = allCustomers.filter(c =>
      c.firstVisitDate < rangeStart
    )
    const generalRevisitCount = nonNewCustomers.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const generalRevisitRate = nonNewCustomers.length > 0
      ? (generalRevisitCount / nonNewCustomers.length) * 100 : 0

    // 신규 재방문
    const newCustomerList = allCustomers.filter(c =>
      c.firstVisitDate >= rangeStart && c.firstVisitDate <= rangeEnd
    )
    const newRevisitCount = newCustomerList.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const newRevisitRate = newCustomerList.length > 0
      ? (newRevisitCount / newCustomerList.length) * 100 : 0

    // 운영 큐 공통: 기간 내 방문/구매 기반 매핑 함수
    const toQueueItem = (c: typeof allCustomers[number]): OperationQueueItem => ({
      customerId: c.id,
      phone: c.phone,
      lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
      totalVisits: customerRecentVisits.get(c.id) || 0,
      totalSpent: customerPeriodSpent.get(c.id) || 0,
      visitSegment: visitSegmentMap.get(c.id)!,
      ticketSegment: ticketSegmentMap.get(c.id)!,
    })

    // 운영 큐: 이탈위험 고객 (세그먼트 분류 결과 그대로 사용)
    const atRiskList: OperationQueueItem[] = allCustomers
      .filter(c => visitSegmentMap.get(c.id) === 'at_risk_7')
      .sort((a, b) => {
        const aDate = a.lastVisitDate?.getTime() || 0
        const bDate = b.lastVisitDate?.getTime() || 0
        return aDate - bDate
      })
      .map(toQueueItem)

    // 운영 큐: 신규가입자 (세그먼트 분류 결과 그대로 사용)
    const newSignupsList: OperationQueueItem[] = allCustomers
      .filter(c => visitSegmentMap.get(c.id) === 'new_0_7')
      .sort((a, b) => b.firstVisitDate.getTime() - a.firstVisitDate.getTime())
      .map(toQueueItem)

    // 운영 큐: 당일권 반복구매자 (amount > 0인 실제 구매만, 시간패키지 사용이력 제외)
    const dayTicketCustomerIds = new Set(
      recentPurchases
        .filter(p => {
          if (decimalToNumber(p.amount) <= 0) return false
          return inferTicketType(p.ticketName) === 'day'
        })
        .map(p => p.customerId)
    )
    const dayTicketRepeaters: OperationQueueItem[] = allCustomers
      .filter(c => {
        if (ticketSegmentMap.get(c.id) !== 'day_ticket') return false
        return dayTicketCustomerIds.has(c.id)
      })
      .sort((a, b) => (customerPeriodSpent.get(b.id) || 0) - (customerPeriodSpent.get(a.id) || 0))
      .map(toQueueItem)

    // 방문 세그먼트별 LTV / 재방문률
    const visitSpentTotals: Record<VisitSegment, { total: number; count: number }> = {
      churned: { total: 0, count: 0 }, at_risk_7: { total: 0, count: 0 },
      new_0_7: { total: 0, count: 0 }, visit_under10: { total: 0, count: 0 },
      visit_10_20: { total: 0, count: 0 }, visit_over20: { total: 0, count: 0 },
    }
    const visitRevisitTotals: Record<VisitSegment, { revisit: number; count: number }> = {
      churned: { revisit: 0, count: 0 }, at_risk_7: { revisit: 0, count: 0 },
      new_0_7: { revisit: 0, count: 0 }, visit_under10: { revisit: 0, count: 0 },
      visit_10_20: { revisit: 0, count: 0 }, visit_over20: { revisit: 0, count: 0 },
    }

    // 이용권 세그먼트별 LTV / 재방문률
    const ticketSpentTotals: Record<TicketSegment, { total: number; count: number }> = {
      day_ticket: { total: 0, count: 0 }, time_ticket: { total: 0, count: 0 },
      term_ticket: { total: 0, count: 0 }, fixed_ticket: { total: 0, count: 0 },
    }
    const ticketRevisitTotals: Record<TicketSegment, { revisit: number; count: number }> = {
      day_ticket: { revisit: 0, count: 0 }, time_ticket: { revisit: 0, count: 0 },
      term_ticket: { revisit: 0, count: 0 }, fixed_ticket: { revisit: 0, count: 0 },
    }

    allCustomers.forEach(c => {
      const vSeg = visitSegmentMap.get(c.id)!
      const tSeg = ticketSegmentMap.get(c.id)!
      const spent = decimalToNumber(c.totalSpent)
      const hasRevisit = (customerRecentVisits.get(c.id) || 0) >= 2

      visitSpentTotals[vSeg].total += spent
      visitSpentTotals[vSeg].count++
      visitRevisitTotals[vSeg].count++
      if (hasRevisit) visitRevisitTotals[vSeg].revisit++

      ticketSpentTotals[tSeg].total += spent
      ticketSpentTotals[tSeg].count++
      ticketRevisitTotals[tSeg].count++
      if (hasRevisit) ticketRevisitTotals[tSeg].revisit++
    })

    const visitSegmentLtv: SegmentChartItem[] = (Object.entries(visitSpentTotals) as [VisitSegment, { total: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: VISIT_SEGMENT_LABELS[seg], value: Math.round(v.total / v.count) }))
      .sort((a, b) => b.value - a.value)

    const visitSegmentRevisitRate: SegmentChartItem[] = (Object.entries(visitRevisitTotals) as [VisitSegment, { revisit: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: VISIT_SEGMENT_LABELS[seg], value: Math.round((v.revisit / v.count) * 100) }))
      .sort((a, b) => b.value - a.value)

    const ticketSegmentLtv: SegmentChartItem[] = (Object.entries(ticketSpentTotals) as [TicketSegment, { total: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: TICKET_SEGMENT_LABELS[seg], value: Math.round(v.total / v.count) }))
      .sort((a, b) => b.value - a.value)

    const ticketSegmentRevisitRate: SegmentChartItem[] = (Object.entries(ticketRevisitTotals) as [TicketSegment, { revisit: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({ segment: seg, label: TICKET_SEGMENT_LABELS[seg], value: Math.round((v.revisit / v.count) * 100) }))
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
