import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/utils/formatters'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { branchId, startDate, endDate, cost, impressions, clicks } = body

    const campaignStart = new Date(startDate)
    const campaignEnd = new Date(endDate)

    // 기간 계산
    const daysDiff = Math.ceil((campaignEnd.getTime() - campaignStart.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 이전 기간 계산
    const beforeStart = new Date(campaignStart)
    beforeStart.setDate(beforeStart.getDate() - daysDiff)
    const beforeEnd = new Date(campaignStart)
    beforeEnd.setDate(beforeEnd.getDate() - 1)

    // 지점 필터
    const branchFilter = branchId === 'all' ? {} : { branchId }

    // 광고 전 데이터 조회
    const beforeMetrics = await prisma.dailyMetric.findMany({
      where: {
        ...branchFilter,
        date: {
          gte: beforeStart,
          lte: beforeEnd
        }
      }
    })

    const beforeVisitors = await prisma.dailyVisitor.findMany({
      where: {
        ...branchFilter,
        visitDate: {
          gte: beforeStart,
          lte: beforeEnd
        }
      }
    })

    // 광고 후 데이터 조회
    const afterMetrics = await prisma.dailyMetric.findMany({
      where: {
        ...branchFilter,
        date: {
          gte: campaignStart,
          lte: campaignEnd
        }
      }
    })

    const afterVisitors = await prisma.dailyVisitor.findMany({
      where: {
        ...branchFilter,
        visitDate: {
          gte: campaignStart,
          lte: campaignEnd
        }
      }
    })

    // 광고 전 메트릭 계산
    const beforeRevenue = beforeMetrics.reduce((sum, m) => sum + decimalToNumber(m.totalRevenue), 0)
    const beforeNewUsers = beforeMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const beforeSeatUsage = beforeMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0)
    const beforeAvgDailyUsers = beforeSeatUsage / (beforeMetrics.length || 1)

    // 광고 후 메트릭 계산
    const afterRevenue = afterMetrics.reduce((sum, m) => sum + decimalToNumber(m.totalRevenue), 0)
    const afterNewUsers = afterMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const afterSeatUsage = afterMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0)
    const afterAvgDailyUsers = afterSeatUsage / (afterMetrics.length || 1)

    // 재방문률 계산 (광고 전)
    const beforeUniqueVisitors = new Set(beforeVisitors.map(v => v.phoneHash)).size
    const beforeTotalVisits = beforeVisitors.length
    const beforeRevisitRate = beforeUniqueVisitors > 0
      ? ((beforeTotalVisits - beforeUniqueVisitors) / beforeUniqueVisitors) * 100
      : 0

    // 재방문률 계산 (광고 후)
    const afterUniqueVisitors = new Set(afterVisitors.map(v => v.phoneHash)).size
    const afterTotalVisits = afterVisitors.length
    const afterRevisitRate = afterUniqueVisitors > 0
      ? ((afterTotalVisits - afterUniqueVisitors) / afterUniqueVisitors) * 100
      : 0

    // 변화량 계산
    const revenueGrowth = beforeRevenue > 0
      ? ((afterRevenue - beforeRevenue) / beforeRevenue) * 100
      : 0

    const newUsersGrowth = beforeNewUsers > 0
      ? ((afterNewUsers - beforeNewUsers) / beforeNewUsers) * 100
      : 0

    const avgDailyUsersGrowth = beforeAvgDailyUsers > 0
      ? ((afterAvgDailyUsers - beforeAvgDailyUsers) / beforeAvgDailyUsers) * 100
      : 0

    const revisitRateGrowth = beforeRevisitRate > 0
      ? ((afterRevisitRate - beforeRevisitRate) / beforeRevisitRate) * 100
      : 0

    // ROI/ROAS 계산
    const revenueIncrease = afterRevenue - beforeRevenue
    const roi = cost > 0 ? ((revenueIncrease - cost) / cost) * 100 : 0
    const roas = cost > 0 ? (afterRevenue / cost) * 100 : 0

    // CTR, CPC 계산
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? cost / clicks : 0

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
      roi,
      roas,
      ctr,
      cpc
    }

    return NextResponse.json({
      success: true,
      data: analysis
    })
  } catch (error) {
    console.error('Campaign analysis failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze campaign'
      },
      { status: 500 }
    )
  }
}
