import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminApi, isErrorResponse } from '@/lib/auth-helpers'

// 전략 분석 (어드민 전용)
export async function POST(request: NextRequest) {
  try {
    // 어드민 권한 체크
    const authResult = await checkAdminApi()
    if (isErrorResponse(authResult)) return authResult

    const body = await request.json()
    const { branchId, startDate, endDate } = body

    // 전략 기간의 메트릭 조회
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: branchId === 'all' ? undefined : branchId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    })

    // 이전 기간 (같은 길이)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    const beforeStartDate = new Date(start)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(start)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: branchId === 'all' ? undefined : branchId,
        date: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

    // 전략 후 지표 계산
    const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const afterAvgDailyUsers = afterMetrics.length > 0
      ? afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / afterMetrics.length
      : 0

    // 전략 전 지표 계산
    const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const beforeAvgDailyUsers = beforeMetrics.length > 0
      ? beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / beforeMetrics.length
      : 0

    // 재방문률 계산 - DailyVisitor 테이블에서
    const afterVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: branchId === 'all' ? undefined : branchId,
        visitDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    })

    const beforeVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: branchId === 'all' ? undefined : branchId,
        visitDate: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

    // 재방문자 수 계산 (서로 다른 날짜만 카운트)
    const calculateRevisitRate = (visitors: any[]) => {
      const phoneVisitDates = new Map<string, Set<string>>()

      visitors.forEach(visitor => {
        const dateStr = visitor.visitDate.toISOString().split('T')[0]
        if (!phoneVisitDates.has(visitor.phoneHash)) {
          phoneVisitDates.set(visitor.phoneHash, new Set())
        }
        phoneVisitDates.get(visitor.phoneHash)!.add(dateStr)
      })

      const revisitors = Array.from(phoneVisitDates.values()).filter(dates => dates.size > 1).length
      const totalUsers = phoneVisitDates.size

      return totalUsers > 0 ? (revisitors / totalUsers) * 100 : 0
    }

    const afterRevisitRate = calculateRevisitRate(afterVisitors)
    const beforeRevisitRate = calculateRevisitRate(beforeVisitors)

    // 변화율 계산
    const revenueGrowth = beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0
    const newUsersGrowth = beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
    const avgDailyUsersGrowth = beforeAvgDailyUsers > 0 ? ((afterAvgDailyUsers - beforeAvgDailyUsers) / beforeAvgDailyUsers) * 100 : 0
    const revisitRateGrowth = beforeRevisitRate > 0 ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100 : 0

    // ROI 계산 (전략은 비용이 없으므로 순수 성장률로 계산)
    const roi = revenueGrowth

    const analysis = {
      beforeMetrics: {
        revenue: beforeRevenue,
        newUsers: beforeNewUsers,
        avgDailyUsers: Math.round(beforeAvgDailyUsers),
        revisitRate: beforeRevisitRate
      },
      afterMetrics: {
        revenue: afterRevenue,
        newUsers: afterNewUsers,
        avgDailyUsers: Math.round(afterAvgDailyUsers),
        revisitRate: afterRevisitRate
      },
      changes: {
        revenueGrowth,
        newUsersGrowth,
        avgDailyUsersGrowth,
        revisitRateGrowth
      },
      roi
    }

    return NextResponse.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('Failed to analyze strategy:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze strategy'
      },
      { status: 500 }
    )
  }
}
