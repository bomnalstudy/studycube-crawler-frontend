import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { calculateSegment, calculateFavoriteTicketType } from '@/lib/crm/segment-calculator'
import { CrmDashboardData, CustomerSegment, OperationQueueItem, SegmentChartItem, SEGMENT_LABELS } from '@/types/crm'

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
    const rangeEnd = endDateParam ? new Date(endDateParam + 'T23:59:59') : now

    // 운영 큐용 30일 기준 (항상 고정)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 병렬 쿼리
    const [
      allCustomers,
      recentVisitors,
      claimCustomerIds,
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
        }
      }),
      // 클레임이 있는 고객 ID
      prisma.customerClaim.findMany({
        where: branchFilter.branchId ? { branchId: branchFilter.branchId } : {},
        select: { customerId: true },
        distinct: ['customerId'],
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
    recentVisitors.forEach(v => {
      // customerId가 있으면 사용, 없으면 phone으로 매칭
      const custId = v.customerId || phoneToCustomerId.get(v.phone)
      if (!custId) return
      const dateStr = v.visitDate.toISOString().split('T')[0]
      if (!customerVisitDates.has(custId)) {
        customerVisitDates.set(custId, new Set())
      }
      customerVisitDates.get(custId)!.add(dateStr)
    })

    const customerRecentVisits = new Map<string, number>()
    customerVisitDates.forEach((dates, customerId) => {
      customerRecentVisits.set(customerId, dates.size)
    })

    // 클레임 고객 Set
    const claimCustomerSet = new Set(claimCustomerIds.map(c => c.customerId))

    // 고객별 구매 데이터
    const customerPurchases = new Map<string, { ticketName: string; amount: number }[]>()
    recentPurchases.forEach(p => {
      if (!customerPurchases.has(p.customerId)) {
        customerPurchases.set(p.customerId, [])
      }
      customerPurchases.get(p.customerId)!.push({
        ticketName: p.ticketName,
        amount: decimalToNumber(p.amount),
      })
    })

    // 세그먼트 분류
    const segmentMap = new Map<string, CustomerSegment>()
    const segmentCounts: Record<CustomerSegment, number> = {
      claim: 0, churned: 0, at_risk_7: 0, new_0_7: 0, day_ticket: 0,
      term_ticket: 0, visit_over20: 0, visit_10_20: 0, visit_under10: 0,
    }

    allCustomers.forEach(customer => {
      const recentVisits = customerRecentVisits.get(customer.id) || 0
      const purchases = customerPurchases.get(customer.id) || []
      const favoriteTicketType = calculateFavoriteTicketType(purchases)

      const segment = calculateSegment({
        hasClaim: claimCustomerSet.has(customer.id),
        lastVisitDate: customer.lastVisitDate,
        firstVisitDate: customer.firstVisitDate,
        recentVisits,
        favoriteTicketType,
      })

      segmentMap.set(customer.id, segment)
      segmentCounts[segment]++
    })

    // KPI
    const totalCustomers = allCustomers.length
    const newCustomers = allCustomers.filter(c => {
      const days = Math.floor((now.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      return days <= 7
    }).length
    const atRiskCustomers = segmentCounts.at_risk_7
    const churnedCustomers = segmentCounts.churned
    const claimCustomers = claimCustomerSet.size

    // 재방문 비율 계산
    // 일반고객 재방문: 최근 30일 내 2회 이상 방문한 비신규 고객 / 전체 비신규 고객
    const nonNewCustomers = allCustomers.filter(c => {
      const days = Math.floor((now.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      return days > 7
    })
    const generalRevisitCount = nonNewCustomers.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const generalRevisitRate = nonNewCustomers.length > 0
      ? (generalRevisitCount / nonNewCustomers.length) * 100 : 0

    // 신규 재방문: 신규(0~7일) 중 2회 이상 방문
    const newCustomerList = allCustomers.filter(c => {
      const days = Math.floor((now.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      return days <= 7
    })
    const newRevisitCount = newCustomerList.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const newRevisitRate = newCustomerList.length > 0
      ? (newRevisitCount / newCustomerList.length) * 100 : 0

    // 운영 큐: 최근 30일 기준
    // 이탈위험 고객 (7일 미방문 + 최근 30일 내 마지막 방문)
    const atRiskList: OperationQueueItem[] = allCustomers
      .filter(c => {
        if (segmentMap.get(c.id) !== 'at_risk_7') return false
        // 최근 30일 내 마지막 방문이 있는 고객만
        if (!c.lastVisitDate) return false
        return c.lastVisitDate >= thirtyDaysAgo
      })
      .sort((a, b) => {
        const aDate = a.lastVisitDate?.getTime() || 0
        const bDate = b.lastVisitDate?.getTime() || 0
        return aDate - bDate // 오래된 순
      })
      .map(c => ({
        customerId: c.id,
        phone: c.phone,
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        segment: segmentMap.get(c.id)!,
      }))

    // 운영 큐: 신규가입자 (최근 30일 내 가입)
    const newSignupsList: OperationQueueItem[] = allCustomers
      .filter(c => {
        if (segmentMap.get(c.id) !== 'new_0_7') return false
        return c.firstVisitDate >= thirtyDaysAgo
      })
      .sort((a, b) => b.firstVisitDate.getTime() - a.firstVisitDate.getTime())
      .map(c => ({
        customerId: c.id,
        phone: c.phone,
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        segment: segmentMap.get(c.id)!,
      }))

    // 운영 큐: 당일권 반복구매자 (최근 30일 내 구매 기록 있는 고객)
    const dayTicketCustomerIds = new Set(
      recentPurchases
        .filter(p => {
          const name = p.ticketName.toLowerCase()
          return name.includes('당일') || name.includes('1일') || name.includes('일일')
        })
        .map(p => p.customerId)
    )
    const dayTicketRepeaters: OperationQueueItem[] = allCustomers
      .filter(c => {
        if (segmentMap.get(c.id) !== 'day_ticket') return false
        return dayTicketCustomerIds.has(c.id)
      })
      .sort((a, b) => decimalToNumber(b.totalSpent) - decimalToNumber(a.totalSpent))
      .map(c => ({
        customerId: c.id,
        phone: c.phone,
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        segment: segmentMap.get(c.id)!,
      }))

    // 세그먼트별 LTV (평균 총소비액)
    const segmentSpentTotals: Record<CustomerSegment, { total: number; count: number }> = {
      claim: { total: 0, count: 0 }, churned: { total: 0, count: 0 }, at_risk_7: { total: 0, count: 0 },
      new_0_7: { total: 0, count: 0 }, day_ticket: { total: 0, count: 0 },
      term_ticket: { total: 0, count: 0 }, visit_over20: { total: 0, count: 0 },
      visit_10_20: { total: 0, count: 0 }, visit_under10: { total: 0, count: 0 },
    }

    allCustomers.forEach(c => {
      const seg = segmentMap.get(c.id)!
      segmentSpentTotals[seg].total += decimalToNumber(c.totalSpent)
      segmentSpentTotals[seg].count++
    })

    const segmentLtv: SegmentChartItem[] = (Object.entries(segmentSpentTotals) as [CustomerSegment, { total: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({
        segment: seg,
        label: SEGMENT_LABELS[seg],
        value: Math.round(v.total / v.count),
      }))
      .sort((a, b) => b.value - a.value)

    // 세그먼트별 재방문률 (30일 내 2회+ 방문 비율)
    const segmentRevisitTotals: Record<CustomerSegment, { revisit: number; count: number }> = {
      claim: { revisit: 0, count: 0 }, churned: { revisit: 0, count: 0 }, at_risk_7: { revisit: 0, count: 0 },
      new_0_7: { revisit: 0, count: 0 }, day_ticket: { revisit: 0, count: 0 },
      term_ticket: { revisit: 0, count: 0 }, visit_over20: { revisit: 0, count: 0 },
      visit_10_20: { revisit: 0, count: 0 }, visit_under10: { revisit: 0, count: 0 },
    }

    allCustomers.forEach(c => {
      const seg = segmentMap.get(c.id)!
      segmentRevisitTotals[seg].count++
      if ((customerRecentVisits.get(c.id) || 0) >= 2) {
        segmentRevisitTotals[seg].revisit++
      }
    })

    const segmentRevisitRate: SegmentChartItem[] = (Object.entries(segmentRevisitTotals) as [CustomerSegment, { revisit: number; count: number }][])
      .filter(([, v]) => v.count > 0)
      .map(([seg, v]) => ({
        segment: seg,
        label: SEGMENT_LABELS[seg],
        value: Math.round((v.revisit / v.count) * 100),
      }))
      .sort((a, b) => b.value - a.value)

    // 세그먼트별 고객 수 (도넛차트용)
    const segmentCountsChart: SegmentChartItem[] = (Object.entries(segmentCounts) as [CustomerSegment, number][])
      .filter(([, count]) => count > 0)
      .map(([seg, count]) => ({
        segment: seg,
        label: SEGMENT_LABELS[seg],
        value: count,
      }))
      .sort((a, b) => b.value - a.value)

    const data: CrmDashboardData = {
      kpi: {
        totalCustomers,
        newCustomers,
        atRiskCustomers,
        churnedCustomers,
        claimCustomers,
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
      segmentCounts: segmentCountsChart,
      segmentLtv,
      segmentRevisitRate,
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
