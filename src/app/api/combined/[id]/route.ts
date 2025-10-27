import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const combined = await prisma.combinedAnalysis.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true
          }
        }
      }
    })

    if (!combined) {
      return NextResponse.json(
        { success: false, error: 'Combined analysis not found' },
        { status: 404 }
      )
    }

    // 통합분석에 연결된 지점 ID 목록
    const combinedBranchIds = combined.branches.map(cb => cb.branchId)

    // 분석 실행
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        date: {
          gte: combined.startDate,
          lte: combined.endDate
        }
      }
    })

    // 이전 기간
    const days = Math.ceil((combined.endDate.getTime() - combined.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const beforeStartDate = new Date(combined.startDate)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(combined.startDate)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        date: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

    // 메트릭 계산
    const afterRevenue = afterMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0)
    const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const afterAvgUsers = afterMetrics.length > 0 ? afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / afterMetrics.length : 0
    const beforeAvgUsers = beforeMetrics.length > 0 ? beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0) / beforeMetrics.length : 0

    // 재방문률 계산
    const afterVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        visitDate: {
          gte: combined.startDate,
          lte: combined.endDate
        }
      }
    })

    const beforeVisitors = await prisma.dailyVisitor.findMany({
      where: {
        branchId: combinedBranchIds.length > 0 ? { in: combinedBranchIds } : undefined,
        visitDate: {
          gte: beforeStartDate,
          lte: beforeEndDate
        }
      }
    })

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

    // ROI, ROAS, CTR, CPC 계산
    const cost = Number(combined.cost || 0)
    const roi = cost > 0 ? ((afterRevenue - beforeRevenue - cost) / cost) * 100 : 0
    const roas = cost > 0 ? (afterRevenue / cost) * 100 : 0
    const ctr = combined.impressions && combined.impressions > 0 ? (combined.clicks! / combined.impressions) * 100 : 0
    const cpc = combined.clicks && combined.clicks > 0 ? cost / combined.clicks : 0

    const analysis = {
      beforeMetrics: {
        revenue: beforeRevenue,
        newUsers: beforeNewUsers,
        avgDailyUsers: beforeAvgUsers,
        revisitRate: beforeRevisitRate
      },
      afterMetrics: {
        revenue: afterRevenue,
        newUsers: afterNewUsers,
        avgDailyUsers: afterAvgUsers,
        revisitRate: afterRevisitRate
      },
      changes: {
        revenueGrowth: beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0,
        newUsersGrowth: beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0,
        avgDailyUsersGrowth: beforeAvgUsers > 0 ? ((afterAvgUsers - beforeAvgUsers) / beforeAvgUsers) * 100 : 0,
        revisitRateGrowth: beforeRevisitRate > 0 ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100 : 0
      },
      roi,
      roas,
      ctr,
      cpc
    }

    return NextResponse.json({
      success: true,
      data: {
        combined,
        analysis
      }
    })
  } catch (error) {
    console.error('Failed to fetch combined detail:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combined detail' },
      { status: 500 }
    )
  }
}
