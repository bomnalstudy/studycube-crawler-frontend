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
    const { branchIds, startDate, endDate } = body

    // 선택된 지점이 없으면 에러
    if (!branchIds || branchIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '지점을 선택해주세요' },
        { status: 400 }
      )
    }

    // 이전 기간 (같은 길이)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    const beforeStartDate = new Date(start)
    beforeStartDate.setDate(beforeStartDate.getDate() - days)
    const beforeEndDate = new Date(start)
    beforeEndDate.setDate(beforeEndDate.getDate() - 1)

    // 지점 정보 조회
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } }
    })
    const branchMap = new Map(branches.map(b => [b.id, b.name]))

    // 재방문자 수 계산 함수
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

    // 각 지점별로 분석 수행
    const branchAnalyses = await Promise.all(
      branchIds.map(async (branchId: string) => {
        // 전략 후 메트릭 조회
        const afterMetrics = await prisma.dailyMetric.findMany({
          where: {
            branchId,
            date: { gte: new Date(startDate), lte: new Date(endDate) }
          }
        })

        // 전략 전 메트릭 조회
        const beforeMetrics = await prisma.dailyMetric.findMany({
          where: {
            branchId,
            date: { gte: beforeStartDate, lte: beforeEndDate }
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

        // 재방문률 계산
        const afterVisitors = await prisma.dailyVisitor.findMany({
          where: {
            branchId,
            visitDate: { gte: new Date(startDate), lte: new Date(endDate) }
          }
        })

        const beforeVisitors = await prisma.dailyVisitor.findMany({
          where: {
            branchId,
            visitDate: { gte: beforeStartDate, lte: beforeEndDate }
          }
        })

        const afterRevisitRate = calculateRevisitRate(afterVisitors)
        const beforeRevisitRate = calculateRevisitRate(beforeVisitors)

        // 변화율 계산
        const revenueGrowth = beforeRevenue > 0 ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100 : 0
        const newUsersGrowth = beforeNewUsers > 0 ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100 : 0
        const avgDailyUsersGrowth = beforeAvgDailyUsers > 0 ? ((afterAvgDailyUsers - beforeAvgDailyUsers) / beforeAvgDailyUsers) * 100 : 0
        const revisitRateGrowth = beforeRevisitRate > 0 ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100 : 0

        return {
          branchId,
          branchName: branchMap.get(branchId) || branchId,
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
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: { branchAnalyses }
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
