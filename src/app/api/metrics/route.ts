import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/utils/formatters'
import { DashboardMetrics } from '@/types/dashboard'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId') || 'all'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // 날짜 파싱
    const startDate = startDateParam ? new Date(startDateParam) : new Date()
    const endDate = endDateParam ? new Date(endDateParam) : new Date()

    // 이전 기간 계산 (같은 기간만큼 이전)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff)
    const prevEndDate = new Date(startDate)
    prevEndDate.setDate(prevEndDate.getDate() - 1)

    // 지점 필터 조건 생성
    const branchFilter = branchId === 'all' ? {} : { branchId }

    // 현재 기간 데이터 조회
    const currentMetrics = await prisma.dailyMetric.findMany({
      where: {
        ...branchFilter,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 이전 기간 데이터 조회
    const previousMetrics = await prisma.dailyMetric.findMany({
      where: {
        ...branchFilter,
        date: {
          gte: prevStartDate,
          lte: prevEndDate
        }
      }
    })

    // 현재 기간 방문자 데이터 (재방문 횟수 계산용)
    const currentVisitors = await prisma.dailyVisitor.findMany({
      where: {
        ...branchFilter,
        visitDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 메트릭 계산
    const totalNewUsers = currentMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
    const totalSeatUsage = currentMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0)

    const totalRevenue = currentMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.totalRevenue),
      0
    )
    const totalDayTicketRevenue = currentMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.dayTicketRevenue),
      0
    )
    const totalTimeTicketRevenue = currentMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.timeTicketRevenue),
      0
    )
    const totalTermTicketRevenue = currentMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.termTicketRevenue),
      0
    )

    const prevTotalRevenue = previousMetrics.reduce(
      (sum, m) => sum + decimalToNumber(m.totalRevenue),
      0
    )

    const daysCount = currentMetrics.length || 1
    const avgDailySeatUsage = totalSeatUsage / daysCount
    const avgDailyRevenue = totalRevenue / daysCount

    // 매출 상승률 계산
    const revenueGrowthRate = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : 0

    // 이용권 타입별 매출 비율
    const revenueByTicketType = {
      day: totalRevenue > 0 ? (totalDayTicketRevenue / totalRevenue) * 100 : 0,
      hour: totalRevenue > 0 ? (totalTimeTicketRevenue / totalRevenue) * 100 : 0,
      period: totalRevenue > 0 ? (totalTermTicketRevenue / totalRevenue) * 100 : 0
    }

    // 재방문자 수 계산 (phoneHash 기준)
    const phoneVisitCount = new Map<string, number>()
    currentVisitors.forEach(visitor => {
      const count = phoneVisitCount.get(visitor.phoneHash) || 0
      phoneVisitCount.set(visitor.phoneHash, count + 1)
    })

    // 방문 횟수별 집계
    const visitCountMap = new Map<number, number>()
    phoneVisitCount.forEach(count => {
      const displayCount = count >= 4 ? 4 : count // 4회 이상은 4로 통합
      const current = visitCountMap.get(displayCount) || 0
      visitCountMap.set(displayCount, current + 1)
    })

    const weeklyRevisitData = Array.from(visitCountMap.entries())
      .map(([visitCount, count]) => ({
        visitCount,
        count
      }))
      .sort((a, b) => a.visitCount - b.visitCount)

    // 고객 인구통계 데이터 집계
    const demographicsMap = new Map<string, number>()
    currentVisitors.forEach(visitor => {
      if (visitor.ageGroup && visitor.gender) {
        const key = `${visitor.ageGroup}-${visitor.gender}`
        const current = demographicsMap.get(key) || 0
        demographicsMap.set(key, current + 1)
      }
    })

    const customerDemographics = Array.from(demographicsMap.entries()).map(([key, count]) => {
      const [ageGroup, gender] = key.split('-')
      return { ageGroup, gender, count }
    })

    const metrics: DashboardMetrics = {
      newUsersThisMonth: totalNewUsers,
      avgDailyTicketUsage: Math.round(avgDailySeatUsage),
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
