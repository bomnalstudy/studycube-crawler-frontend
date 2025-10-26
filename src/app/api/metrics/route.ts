import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentMonthRange, getPreviousMonthRange } from '@/lib/utils/date-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { DashboardMetrics } from '@/types/dashboard'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId') || 'default'

    const { startDate, endDate } = getCurrentMonthRange()
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousMonthRange()

    // 이번달 데이터 조회
    const currentMonthMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 이전달 데이터 조회
    const previousMonthMetrics = await prisma.dailyMetric.findMany({
      where: {
        branchId,
        date: {
          gte: prevStartDate,
          lte: prevEndDate
        }
      }
    })

    // 재방문 고객 데이터
    const revisitData = await prisma.revisitCustomer.findMany({
      where: {
        branchId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        visitCount: 'asc'
      }
    })

    // 고객 인구통계 데이터
    const demographics = await prisma.customerDemographic.findMany({
      where: {
        branchId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 메트릭 계산
    const totalNewUsers = currentMonthMetrics.reduce((sum, m) => sum + m.newUsers, 0)
    const totalTicketUsage = currentMonthMetrics.reduce((sum, m) => sum + m.ticketUsage, 0)
    const totalRevenue = currentMonthMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.revenue),
      0
    )
    const totalRevenueDay = currentMonthMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.revenueDay),
      0
    )
    const totalRevenueHour = currentMonthMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.revenueHour),
      0
    )
    const totalRevenuePeriod = currentMonthMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.revenuePeriod),
      0
    )

    const prevTotalRevenue = previousMonthMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.revenue),
      0
    )

    const daysCount = currentMonthMetrics.length || 1
    const avgDailyTicketUsage = totalTicketUsage / daysCount
    const avgDailyRevenue = totalRevenue / daysCount

    // 매출 상승률 계산
    const revenueGrowthRate = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : 0

    // 이용권 타입별 매출 비율
    const revenueByTicketType = {
      day: totalRevenue > 0 ? (totalRevenueDay / totalRevenue) * 100 : 0,
      hour: totalRevenue > 0 ? (totalRevenueHour / totalRevenue) * 100 : 0,
      period: totalRevenue > 0 ? (totalRevenuePeriod / totalRevenue) * 100 : 0
    }

    // 재방문자 데이터 집계
    const weeklyRevisitMap = new Map<number, number>()
    revisitData.forEach(item => {
      const current = weeklyRevisitMap.get(item.visitCount) || 0
      weeklyRevisitMap.set(item.visitCount, current + item.count)
    })

    const weeklyRevisitData = Array.from(weeklyRevisitMap.entries()).map(([visitCount, count]) => ({
      visitCount,
      count
    }))

    // 인구통계 데이터 집계
    const demographicsMap = new Map<string, number>()
    demographics.forEach(item => {
      const key = `${item.ageGroup}-${item.gender}`
      const current = demographicsMap.get(key) || 0
      demographicsMap.set(key, current + item.count)
    })

    const customerDemographics = Array.from(demographicsMap.entries()).map(([key, count]) => {
      const [ageGroup, gender] = key.split('-')
      return { ageGroup, gender, count }
    })

    const metrics: DashboardMetrics = {
      newUsersThisMonth: totalNewUsers,
      avgDailyTicketUsage: Math.round(avgDailyTicketUsage),
      revenueByTicketType,
      revenueGrowthRate,
      monthlyRevenue: totalRevenue,
      avgDailyRevenue,
      weeklyRevisitData,
      customerDemographics
    }

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics'
      },
      { status: 500 }
    )
  }
}
