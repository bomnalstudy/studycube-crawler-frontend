import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/utils/formatters'
import { DashboardMetrics } from '@/types/dashboard'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // 인증 체크
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const requestedBranchId = searchParams.get('branchId') || 'all'
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

    // 권한 기반 지점 필터 (지점 계정은 자기 지점만)
    const branchFilter = getBranchFilter(session, requestedBranchId)

    // 모든 쿼리를 병렬로 실행하여 로딩 시간 단축
    const [
      currentMetrics,
      previousMetrics,
      latestMetric,
      hourlyUsageRecords,
      ticketRevenueRecords
    ] = await Promise.all([
      // 현재 기간 데이터 조회
      prisma.dailyMetric.findMany({
        where: {
          ...branchFilter,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      // 이전 기간 데이터 조회
      prisma.dailyMetric.findMany({
        where: {
          ...branchFilter,
          date: {
            gte: prevStartDate,
            lte: prevEndDate
          }
        }
      }),
      // 마지막 데이터 날짜 찾기
      prisma.dailyMetric.findFirst({
        where: branchFilter,
        orderBy: {
          date: 'desc'
        }
      }),
      // 시간대별 이용자 데이터 조회
      prisma.hourlyUsage.findMany({
        where: {
          ...branchFilter,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      // 이용권별 매출 조회
      prisma.ticket_revenue.findMany({
        where: {
          ...branchFilter,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ])

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
    const prevDaysCount = previousMetrics.length || 1
    const avgDailySeatUsage = totalSeatUsage / daysCount
    const avgDailyRevenue = totalRevenue / daysCount
    const prevAvgDailyRevenue = prevTotalRevenue / prevDaysCount

    // 매출 상승률 계산
    const revenueGrowthRate = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : 0

    // 일 평균 매출 변화율 계산
    const avgDailyRevenueGrowthRate = prevAvgDailyRevenue > 0
      ? ((avgDailyRevenue - prevAvgDailyRevenue) / prevAvgDailyRevenue) * 100
      : 0

    // 이용권 타입별 매출 비율
    const revenueByTicketType = {
      day: totalRevenue > 0 ? (totalDayTicketRevenue / totalRevenue) * 100 : 0,
      hour: totalRevenue > 0 ? (totalTimeTicketRevenue / totalRevenue) * 100 : 0,
      period: totalRevenue > 0 ? (totalTermTicketRevenue / totalRevenue) * 100 : 0
    }

    // DailyMetric에서 성별 데이터 집계
    const totalMale = currentMetrics.reduce((sum, m) => sum + (m.newUsersMale || 0), 0)
    const totalFemale = currentMetrics.reduce((sum, m) => sum + (m.newUsersFemale || 0), 0)

    // DailyMetric에서 연령대 데이터 집계
    const total10s = currentMetrics.reduce((sum, m) => sum + (m.newUsers10s || 0), 0)
    const total20s = currentMetrics.reduce((sum, m) => sum + (m.newUsers20s || 0), 0)
    const total30s = currentMetrics.reduce((sum, m) => sum + (m.newUsers30s || 0), 0)
    const total40s = currentMetrics.reduce((sum, m) => sum + (m.newUsers40s || 0), 0)
    const total50s = currentMetrics.reduce((sum, m) => sum + (m.newUsers50s || 0), 0)
    const total60plus = currentMetrics.reduce((sum, m) => sum + (m.newUsers60plus || 0), 0)

    // 고객 인구통계 데이터 생성 (성별과 연령대를 별도로)
    const customerDemographics = [
      // 성별 데이터
      { ageGroup: '전체', gender: '남자', count: totalMale },
      { ageGroup: '전체', gender: '여자', count: totalFemale },
      // 연령대 데이터 (성별 구분 없이)
      { ageGroup: '10대', gender: '전체', count: total10s },
      { ageGroup: '20대', gender: '전체', count: total20s },
      { ageGroup: '30대', gender: '전체', count: total30s },
      { ageGroup: '40대', gender: '전체', count: total40s },
      { ageGroup: '50대', gender: '전체', count: total50s },
      { ageGroup: '60대+', gender: '전체', count: total60plus }
    ].filter(item => item.count > 0) // count가 0인 항목 제거

    // 재방문자 데이터 계산 (선택한 기간 전체)
    let weeklyRevisitData: Array<{ visitCount: number; count: number }> = []

    // 선택한 기간의 방문자 데이터 조회
    const periodVisitors = await prisma.dailyVisitor.findMany({
      where: {
        ...branchFilter,
        visitDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // phoneHash별로 서로 다른 방문 날짜를 Set으로 관리
    const phoneVisitDates = new Map<string, Set<string>>()
    periodVisitors.forEach(visitor => {
      const dateStr = visitor.visitDate.toISOString().split('T')[0] // YYYY-MM-DD
      if (!phoneVisitDates.has(visitor.phoneHash)) {
        phoneVisitDates.set(visitor.phoneHash, new Set())
      }
      phoneVisitDates.get(visitor.phoneHash)!.add(dateStr)
    })

    // 방문 횟수별 집계 (실제 횟수 그대로 표시)
    const visitCountMap = new Map<number, number>()
    phoneVisitDates.forEach((dates) => {
      const visitCount = dates.size // 서로 다른 날짜의 수
      const current = visitCountMap.get(visitCount) || 0
      visitCountMap.set(visitCount, current + 1)
    })

    weeklyRevisitData = Array.from(visitCountMap.entries())
      .map(([visitCount, count]) => ({
        visitCount,
        count
      }))
      .sort((a, b) => a.visitCount - b.visitCount)

    // 시간대별 평균 이용자 수 계산
    const hourlyTotals = new Map<number, { total: number; days: Set<string> }>()

    hourlyUsageRecords.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0]
      if (!hourlyTotals.has(record.hour)) {
        hourlyTotals.set(record.hour, { total: 0, days: new Set() })
      }
      const hourData = hourlyTotals.get(record.hour)!
      hourData.total += record.usageCount
      hourData.days.add(dateStr)
    })

    // 0~23시까지 모든 시간대 데이터 생성 (평균값)
    const hourlyUsageData = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyTotals.get(hour)
      const avgCount = hourData && hourData.days.size > 0
        ? Math.round(hourData.total / hourData.days.size)
        : 0
      return { hour, count: avgCount }
    })

    // 이용권명별 매출 합계 계산 (병렬로 이미 조회됨)
    const ticketRevenueMap = new Map<string, number>()
    ticketRevenueRecords.forEach(record => {
      const current = ticketRevenueMap.get(record.ticketName) || 0
      ticketRevenueMap.set(record.ticketName, current + decimalToNumber(record.revenue))
    })

    // Top 10 정렬
    const ticketRevenueTop10 = Array.from(ticketRevenueMap.entries())
      .map(([ticketName, revenue]) => ({ ticketName, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const metrics: DashboardMetrics = {
      newUsersThisMonth: totalNewUsers,
      avgDailyTicketUsage: Math.round(avgDailySeatUsage),
      revenueByTicketType,
      revenueGrowthRate,
      monthlyRevenue: totalRevenue,
      avgDailyRevenue,
      avgDailyRevenueGrowthRate,
      weeklyRevisitData,
      customerDemographics,
      hourlyUsageData,
      ticketRevenueTop10
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
