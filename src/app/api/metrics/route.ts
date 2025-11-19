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
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 현재 기간에 실제 데이터가 있는 날짜들 추출
    const currentDates = currentMetrics.map(m => m.date)
    const actualDaysCount = currentDates.length

    // 이전 기간 계산: 현재 기간에 데이터가 있는 일수만큼만 이전 달의 같은 날짜 범위와 비교
    // 예: 11-01 ~ 11-15 데이터가 있으면 → 10-01 ~ 10-15와 비교
    // 단, 현재 달이 끝까지 채워졌거나 이전 달과 일수가 다른 경우 각 달 전체 비교
    let previousMetrics: typeof currentMetrics = []

    if (actualDaysCount > 0) {
      // 현재 기간의 첫 번째와 마지막 데이터 날짜
      const firstDataDate = new Date(currentDates[0])
      const lastDataDate = new Date(currentDates[currentDates.length - 1])

      // 해당 월의 마지막 날 계산
      const lastDayOfCurrentMonth = new Date(lastDataDate.getFullYear(), lastDataDate.getMonth() + 1, 0).getDate()
      const lastDayOfPrevMonth = new Date(lastDataDate.getFullYear(), lastDataDate.getMonth(), 0).getDate()

      // 마지막 데이터 날짜의 일(day)
      const lastDataDay = lastDataDate.getDate()

      // 이전 달의 날짜 범위 계산
      const prevStartDate = new Date(firstDataDate)
      prevStartDate.setMonth(prevStartDate.getMonth() - 1)

      let prevEndDate: Date

      // 현재 데이터가 월말까지 있는 경우에만 각 달 전체 비교
      // (실제 데이터의 마지막 날이 해당 월의 마지막 날인 경우)
      if (lastDataDay === lastDayOfCurrentMonth) {
        // 이전 달 전체와 비교 (이전 달의 마지막 날까지)
        prevEndDate = new Date(lastDataDate.getFullYear(), lastDataDate.getMonth(), 0)
      } else {
        // 이전 달 같은 날짜까지만 비교
        // 단, 이전 달의 일수가 더 적은 경우 이전 달의 마지막 날까지만
        const targetDay = Math.min(lastDataDay, lastDayOfPrevMonth)
        prevEndDate = new Date(lastDataDate.getFullYear(), lastDataDate.getMonth() - 1, targetDay)
      }

      // 이전 기간 데이터 조회
      previousMetrics = await prisma.dailyMetric.findMany({
        where: {
          ...branchFilter,
          date: {
            gte: prevStartDate,
            lte: prevEndDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      })
    }

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

    // 이전 기간 일 평균 매출 계산
    const prevDaysCount = previousMetrics.length || 1
    const prevAvgDailyRevenue = prevTotalRevenue / prevDaysCount

    // 매출 상승률 계산
    const revenueGrowthRate = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : 0

    // 일 평균 매출 상승률 계산
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

    // 재방문자 데이터 계산 (실제 데이터의 마지막 날짜 기준 일주일)
    let weeklyRevisitData: Array<{ visitCount: number; count: number }> = []

    if (actualDaysCount > 0) {
      // 실제 데이터의 마지막 날짜를 기준으로 일주일 계산
      const lastDataDate = new Date(currentDates[currentDates.length - 1])
      const weekAgoDate = new Date(lastDataDate)
      weekAgoDate.setDate(weekAgoDate.getDate() - 6) // 7일간 (오늘 포함)

      // 최근 일주일 방문자 데이터 조회
      const recentVisitors = await prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: {
            gte: weekAgoDate,
            lte: lastDataDate
          }
        }
      })

      // phoneHash별로 서로 다른 방문 날짜를 Set으로 관리
      const phoneVisitDates = new Map<string, Set<string>>()
      recentVisitors.forEach(visitor => {
        const dateStr = visitor.visitDate.toISOString().split('T')[0] // YYYY-MM-DD
        if (!phoneVisitDates.has(visitor.phoneHash)) {
          phoneVisitDates.set(visitor.phoneHash, new Set())
        }
        phoneVisitDates.get(visitor.phoneHash)!.add(dateStr)
      })

      // 방문 횟수별 집계 (서로 다른 날짜 기준)
      const visitCountMap = new Map<number, number>()
      phoneVisitDates.forEach((dates) => {
        const visitCount = dates.size // 서로 다른 날짜의 수
        const displayCount = visitCount >= 4 ? 4 : visitCount // 4회 이상은 4로 통합
        const current = visitCountMap.get(displayCount) || 0
        visitCountMap.set(displayCount, current + 1)
      })

      weeklyRevisitData = Array.from(visitCountMap.entries())
        .map(([visitCount, count]) => ({
          visitCount,
          count
        }))
        .sort((a, b) => a.visitCount - b.visitCount)
    }

    const metrics: DashboardMetrics = {
      newUsersThisMonth: totalNewUsers,
      avgDailyTicketUsage: Math.round(avgDailySeatUsage),
      revenueByTicketType,
      revenueGrowthRate,
      monthlyRevenue: totalRevenue,
      avgDailyRevenue,
      avgDailyRevenueGrowthRate,
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
