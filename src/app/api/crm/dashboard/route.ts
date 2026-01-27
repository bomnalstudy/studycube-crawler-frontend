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
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

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
      // 30일 내 방문자 (고객별 방문 날짜 수)
      prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: thirtyDaysAgo },
          customerId: { not: null },
        },
        select: {
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
      // 30일 내 구매 (이용권 타입 분류용)
      prisma.customerPurchase.findMany({
        where: {
          ...branchFilter,
          purchaseDate: { gte: thirtyDaysAgo },
        },
        select: {
          customerId: true,
          ticketName: true,
          amount: true,
        }
      }),
    ])

    // 30일 내 방문 수 계산 (고객별 서로 다른 날짜 수)
    const customerVisitDates = new Map<string, Set<string>>()
    recentVisitors.forEach(v => {
      if (!v.customerId) return
      const dateStr = v.visitDate.toISOString().split('T')[0]
      if (!customerVisitDates.has(v.customerId)) {
        customerVisitDates.set(v.customerId, new Set())
      }
      customerVisitDates.get(v.customerId)!.add(dateStr)
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
      claim: 0, at_risk_7: 0, new_0_3: 0, day_ticket: 0,
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
      return days <= 3
    }).length
    const atRiskCustomers = segmentCounts.at_risk_7
    const claimCustomers = claimCustomerSet.size

    // 재방문 비율 계산
    // 일반고객 재방문: 최근 30일 내 2회 이상 방문한 비기신규 고객 / 전체 비기신규 고객
    const nonNewCustomers = allCustomers.filter(c => {
      const days = Math.floor((now.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      return days > 3
    })
    const generalRevisitCount = nonNewCustomers.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const generalRevisitRate = nonNewCustomers.length > 0
      ? (generalRevisitCount / nonNewCustomers.length) * 100 : 0

    // 신규 재방문: 신규(0~3일) 중 2회 이상 방문
    const newCustomerList = allCustomers.filter(c => {
      const days = Math.floor((now.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      return days <= 3
    })
    const newRevisitCount = newCustomerList.filter(c =>
      (customerRecentVisits.get(c.id) || 0) >= 2
    ).length
    const newRevisitRate = newCustomerList.length > 0
      ? (newRevisitCount / newCustomerList.length) * 100 : 0

    // 운영 큐: 이탈위험 고객 (7일 미방문, 최근 10명)
    const atRiskList: OperationQueueItem[] = allCustomers
      .filter(c => segmentMap.get(c.id) === 'at_risk_7')
      .sort((a, b) => {
        const aDate = a.lastVisitDate?.getTime() || 0
        const bDate = b.lastVisitDate?.getTime() || 0
        return aDate - bDate // 오래된 순
      })
      .slice(0, 10)
      .map(c => ({
        customerId: c.id,
        phone: c.phone,
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        segment: segmentMap.get(c.id)!,
      }))

    // 운영 큐: 신규가입자 (최근 10명)
    const newSignupsList: OperationQueueItem[] = allCustomers
      .filter(c => segmentMap.get(c.id) === 'new_0_3')
      .sort((a, b) => b.firstVisitDate.getTime() - a.firstVisitDate.getTime())
      .slice(0, 10)
      .map(c => ({
        customerId: c.id,
        phone: c.phone,
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        segment: segmentMap.get(c.id)!,
      }))

    // 운영 큐: 당일권 반복구매자
    const dayTicketRepeaters: OperationQueueItem[] = allCustomers
      .filter(c => segmentMap.get(c.id) === 'day_ticket')
      .sort((a, b) => decimalToNumber(b.totalSpent) - decimalToNumber(a.totalSpent))
      .slice(0, 10)
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
      claim: { total: 0, count: 0 }, at_risk_7: { total: 0, count: 0 },
      new_0_3: { total: 0, count: 0 }, day_ticket: { total: 0, count: 0 },
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
      claim: { revisit: 0, count: 0 }, at_risk_7: { revisit: 0, count: 0 },
      new_0_3: { revisit: 0, count: 0 }, day_ticket: { revisit: 0, count: 0 },
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

    const data: CrmDashboardData = {
      kpi: {
        totalCustomers,
        newCustomers,
        atRiskCustomers,
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
