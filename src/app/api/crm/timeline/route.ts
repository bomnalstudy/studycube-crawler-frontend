import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { kstStartOfDay, kstEndOfDay } from '@/lib/utils/kst-date'
import { TimelineData, TimelineHourData, TimelineVisitor } from '@/types/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const requestedBranchId = searchParams.get('branchId') || 'all'
    const branchFilter = getBranchFilter(session, requestedBranchId)

    if (!dateParam) {
      return NextResponse.json({ success: false, error: 'date parameter is required' }, { status: 400 })
    }

    const dayStart = kstStartOfDay(dateParam)
    const dayEnd = kstEndOfDay(dateParam)

    // 병렬 조회: 시간대별 이용자 수 + 방문자 상세
    const [hourlyUsages, visitors, branch] = await Promise.all([
      prisma.hourlyUsage.findMany({
        where: {
          ...branchFilter,
          date: dayStart,
        },
        select: {
          hour: true,
          usageCount: true,
        },
        orderBy: { hour: 'asc' },
      }),
      prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: dayStart, lte: dayEnd },
        },
        select: {
          phone: true,
          seat: true,
          startTime: true,
          visitTime: true,
          duration: true,
          ageGroup: true,
          gender: true,
          customerId: true,
        },
      }),
      branchFilter.branchId
        ? prisma.branch.findUnique({
            where: { id: branchFilter.branchId },
            select: { name: true },
          })
        : null,
    ])

    // 시간대별 usageCount 맵
    const usageMap = new Map<number, number>()
    hourlyUsages.forEach(h => {
      usageMap.set(h.hour, h.usageCount)
    })

    // 방문자를 시간대별로 그룹핑
    const visitorsByHour = new Map<number, TimelineVisitor[]>()
    visitors.forEach(v => {
      const hour = extractHour(v.startTime, v.visitTime)
      if (hour === null) return

      const visitor: TimelineVisitor = {
        phone: v.phone,
        seat: v.seat,
        startTime: formatTimeToHHMM(v.startTime, v.visitTime),
        duration: v.duration,
        ageGroup: v.ageGroup,
        gender: v.gender,
        customerId: v.customerId,
      }

      if (!visitorsByHour.has(hour)) {
        visitorsByHour.set(hour, [])
      }
      visitorsByHour.get(hour)!.push(visitor)
    })

    // 24시간 배열 생성
    const hours: TimelineHourData[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      usageCount: usageMap.get(i) || 0,
      visitors: visitorsByHour.get(i) || [],
    }))

    const data: TimelineData = {
      date: dateParam,
      branchId: requestedBranchId,
      branchName: branch?.name || null,
      hours,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch timeline:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timeline data' },
      { status: 500 }
    )
  }
}

/** startTime(DateTime) 또는 visitTime("HH:mm") 에서 hour 추출 */
function extractHour(startTime: Date | null, visitTime: string | null): number | null {
  if (startTime) {
    // KST 기준 시간 추출
    const kstHour = new Date(startTime).toLocaleString('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(kstHour, 10)
  }
  if (visitTime) {
    const parts = visitTime.split(':')
    if (parts.length >= 1) {
      const h = parseInt(parts[0], 10)
      if (!isNaN(h) && h >= 0 && h <= 23) return h
    }
  }
  return null
}

/** startTime(DateTime) 또는 visitTime(string)을 "HH:mm" 형식으로 변환 */
function formatTimeToHHMM(startTime: Date | null, visitTime: string | null): string | null {
  if (startTime) {
    return new Date(startTime).toLocaleString('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  if (visitTime) {
    // "HH:mm" 또는 "HH:mm:ss" → "HH:mm"
    return visitTime.substring(0, 5)
  }
  return null
}
