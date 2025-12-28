import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfDay, endOfDay } from 'date-fns'
import { decimalToNumber } from '@/lib/utils/formatters'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const start = startOfDay(parseISO(startDate))
    const end = endOfDay(parseISO(endDate))

    // 모든 지점 조회
    const branches = await prisma.branch.findMany({
      orderBy: { index: 'asc' }
    })

    // 이전 기간 계산
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const prevStart = new Date(start)
    prevStart.setDate(prevStart.getDate() - daysDiff)
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)

    const allBranchData = []

    // 각 지점별로 데이터 생성
    for (const branch of branches) {
      const branchFilter = { branchId: branch.id }

      const [
        currentMetrics,
        previousMetrics,
        latestMetric,
        hourlyUsageRecords,
        ticketRevenueRecords,
        ticketBuyersRecords
      ] = await Promise.all([
        prisma.dailyMetric.findMany({
          where: { ...branchFilter, date: { gte: start, lte: end } }
        }),
        prisma.dailyMetric.findMany({
          where: { ...branchFilter, date: { gte: prevStart, lte: prevEnd } }
        }),
        prisma.dailyMetric.findFirst({
          where: branchFilter,
          orderBy: { date: 'desc' }
        }),
        prisma.hourlyUsage.findMany({
          where: { ...branchFilter, date: { gte: start, lte: end } }
        }),
        prisma.ticket_revenue.findMany({
          where: { ...branchFilter, date: { gte: start, lte: end } }
        }),
        prisma.ticketBuyer.findMany({
          where: { ...branchFilter, date: { gte: start, lte: end } },
          orderBy: { date: 'asc' }
        })
      ])

      // 메트릭 계산
      const totalNewUsers = currentMetrics.reduce((sum, m) => sum + (m.newUsers || 0), 0)
      const totalSeatUsage = currentMetrics.reduce((sum, m) => sum + (m.seatUsage || 0), 0)
      const totalRevenue = currentMetrics.reduce((sum, m) => sum + decimalToNumber(m.totalRevenue), 0)
      const totalDayTicketRevenue = currentMetrics.reduce((sum, m) => sum + decimalToNumber(m.dayTicketRevenue), 0)
      const totalTimeTicketRevenue = currentMetrics.reduce((sum, m) => sum + decimalToNumber(m.timeTicketRevenue), 0)
      const totalTermTicketRevenue = currentMetrics.reduce((sum, m) => sum + decimalToNumber(m.termTicketRevenue), 0)
      const prevTotalRevenue = previousMetrics.reduce((sum, m) => sum + decimalToNumber(m.totalRevenue), 0)

      const daysCount = currentMetrics.length || 1
      const prevDaysCount = previousMetrics.length || 1
      const avgDailySeatUsage = totalSeatUsage / daysCount
      const avgDailyRevenue = totalRevenue / daysCount
      const prevAvgDailyRevenue = prevTotalRevenue / prevDaysCount

      const revenueGrowthRate = prevTotalRevenue > 0
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
        : 0

      const avgDailyRevenueGrowthRate = prevAvgDailyRevenue > 0
        ? ((avgDailyRevenue - prevAvgDailyRevenue) / prevAvgDailyRevenue) * 100
        : 0

      const revenueByTicketType = {
        day: totalRevenue > 0 ? (totalDayTicketRevenue / totalRevenue) * 100 : 0,
        hour: totalRevenue > 0 ? (totalTimeTicketRevenue / totalRevenue) * 100 : 0,
        period: totalRevenue > 0 ? (totalTermTicketRevenue / totalRevenue) * 100 : 0
      }

      const totalMale = currentMetrics.reduce((sum, m) => sum + (m.newUsersMale || 0), 0)
      const totalFemale = currentMetrics.reduce((sum, m) => sum + (m.newUsersFemale || 0), 0)
      const total10s = currentMetrics.reduce((sum, m) => sum + (m.newUsers10s || 0), 0)
      const total20s = currentMetrics.reduce((sum, m) => sum + (m.newUsers20s || 0), 0)
      const total30s = currentMetrics.reduce((sum, m) => sum + (m.newUsers30s || 0), 0)
      const total40s = currentMetrics.reduce((sum, m) => sum + (m.newUsers40s || 0), 0)
      const total50s = currentMetrics.reduce((sum, m) => sum + (m.newUsers50s || 0), 0)
      const total60plus = currentMetrics.reduce((sum, m) => sum + (m.newUsers60plus || 0), 0)

      const customerDemographics = [
        { ageGroup: '전체', gender: '남자', count: totalMale },
        { ageGroup: '전체', gender: '여자', count: totalFemale },
        { ageGroup: '10대', gender: '전체', count: total10s },
        { ageGroup: '20대', gender: '전체', count: total20s },
        { ageGroup: '30대', gender: '전체', count: total30s },
        { ageGroup: '40대', gender: '전체', count: total40s },
        { ageGroup: '50대', gender: '전체', count: total50s },
        { ageGroup: '60대+', gender: '전체', count: total60plus }
      ].filter(item => item.count > 0)

      let weeklyRevisitData: Array<{ visitCount: number; count: number }> = []

      const periodVisitors = await prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: start, lte: end }
        }
      })

      const phoneVisitDates = new Map<string, Set<string>>()
      periodVisitors.forEach(visitor => {
        const dateStr = visitor.visitDate.toISOString().split('T')[0]
        if (!phoneVisitDates.has(visitor.phoneHash)) {
          phoneVisitDates.set(visitor.phoneHash, new Set())
        }
        phoneVisitDates.get(visitor.phoneHash)!.add(dateStr)
      })

      const visitCountMap = new Map<number, number>()
      phoneVisitDates.forEach((dates) => {
        const visitCount = dates.size
        const current = visitCountMap.get(visitCount) || 0
        visitCountMap.set(visitCount, current + 1)
      })

      weeklyRevisitData = Array.from(visitCountMap.entries())
        .map(([visitCount, count]) => ({ visitCount, count }))
        .sort((a, b) => a.visitCount - b.visitCount)

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

      const hourlyUsageData = Array.from({ length: 24 }, (_, hour) => {
        const hourData = hourlyTotals.get(hour)
        const avgCount = hourData && hourData.days.size > 0
          ? Math.round(hourData.total / hourData.days.size)
          : 0
        return { hour, count: avgCount }
      })

      const ticketRevenueMap = new Map<string, number>()
      ticketRevenueRecords.forEach(record => {
        const current = ticketRevenueMap.get(record.ticketName) || 0
        ticketRevenueMap.set(record.ticketName, current + decimalToNumber(record.revenue))
      })

      const ticketRevenueTop10 = Array.from(ticketRevenueMap.entries())
        .map(([ticketName, revenue]) => ({ ticketName, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // ticket_buyers 데이터 포맷팅
      const ticketBuyersData = ticketBuyersRecords.map(record => ({
        customerHash: record.customerHash,
        gender: record.gender,
        ageGroup: record.ageGroup,
        ticketName: record.ticketName,
        date: record.date.toISOString().split('T')[0],
        branchId: record.branchId
      }))

      allBranchData.push({
        branch: { id: branch.id, name: branch.name },
        period: { startDate, endDate },
        metrics: {
          newUsersThisMonth: totalNewUsers,
          avgDailyTicketUsage: Math.round(avgDailySeatUsage),
          monthlyRevenue: totalRevenue,
          avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
          revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
          avgDailyRevenueGrowthRate: Math.round(avgDailyRevenueGrowthRate * 100) / 100,
          revenueByTicketType: {
            day: Math.round(revenueByTicketType.day * 100) / 100,
            hour: Math.round(revenueByTicketType.hour * 100) / 100,
            period: Math.round(revenueByTicketType.period * 100) / 100
          },
          weeklyRevisitData,
          customerDemographics,
          ticketRevenueTop10,
          hourlyUsageData
        },
        ticketBuyers: ticketBuyersData
      })
    }

    const jsonData = {
      exportedAt: new Date().toISOString(),
      period: { startDate, endDate },
      branches: allBranchData
    }

    const fileName = `studycube-dashboard-all-branches-${startDate}-${endDate}.json`

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    })
  } catch (error) {
    console.error('JSON export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export JSON' },
      { status: 500 }
    )
  }
}
