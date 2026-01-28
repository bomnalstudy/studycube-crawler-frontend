import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, kstEndOfDay, getKSTYesterdayStr, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment, calculateFavoriteTicketType } from '@/lib/crm/segment-calculator'
import { CustomerListItem, VisitSegment, TicketSegment, PaginatedResponse } from '@/types/crm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedBranchId = searchParams.get('branchId') || 'all'
    const branchFilter = getBranchFilter(session, requestedBranchId)

    // 필터 파라미터
    const visitSegment = searchParams.get('visitSegment') as VisitSegment | null
    const ticketSegment = searchParams.get('ticketSegment') as TicketSegment | null
    const ageGroup = searchParams.get('ageGroup')
    const gender = searchParams.get('gender')
    const minVisits = searchParams.get('minVisits') ? Number(searchParams.get('minVisits')) : undefined
    const maxVisits = searchParams.get('maxVisits') ? Number(searchParams.get('maxVisits')) : undefined
    const minSpent = searchParams.get('minSpent') ? Number(searchParams.get('minSpent')) : undefined
    const maxSpent = searchParams.get('maxSpent') ? Number(searchParams.get('maxSpent')) : undefined
    const hasClaim = searchParams.get('hasClaim')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'lastVisitDate'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')))

    // 방문수 커스텀 날짜 범위
    const visitStartDate = searchParams.get('visitStartDate')
    const visitEndDate = searchParams.get('visitEndDate')

    // KST 기준 날짜 계산
    const yesterdayStr = getKSTYesterdayStr()
    const yesterday = kstEndOfDay(yesterdayStr)
    const visitRangeStart = visitStartDate ? kstStartOfDay(visitStartDate) : kstStartOfDay(getKSTDaysAgoStr(30))
    const visitRangeEndRaw = visitEndDate ? kstEndOfDay(visitEndDate) : yesterday
    const visitRangeEnd = visitRangeEndRaw > yesterday ? yesterday : visitRangeEndRaw

    // Prisma where 조건
    const customerWhere: Record<string, unknown> = {}
    if (branchFilter.branchId) {
      customerWhere.mainBranchId = branchFilter.branchId
    }
    if (ageGroup) customerWhere.ageGroup = ageGroup
    if (gender) customerWhere.gender = gender
    if (search) customerWhere.phone = { contains: search }

    // totalSpent 필터
    if (minSpent !== undefined || maxSpent !== undefined) {
      customerWhere.totalSpent = {}
      if (minSpent !== undefined) (customerWhere.totalSpent as Record<string, number>).gte = minSpent
      if (maxSpent !== undefined) (customerWhere.totalSpent as Record<string, number>).lte = maxSpent
    }

    // totalVisits 필터
    if (minVisits !== undefined || maxVisits !== undefined) {
      customerWhere.totalVisits = {}
      if (minVisits !== undefined) (customerWhere.totalVisits as Record<string, number>).gte = minVisits
      if (maxVisits !== undefined) (customerWhere.totalVisits as Record<string, number>).lte = maxVisits
    }

    // 병렬 데이터 조회
    const [customers, recentVisitors, claimCounts] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere,
        select: {
          id: true,
          phone: true,
          gender: true,
          ageGroup: true,
          firstVisitDate: true,
          lastVisitDate: true,
          totalVisits: true,
          totalSpent: true,
        }
      }),
      // 기간 내 방문 데이터
      prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: visitRangeStart, lte: visitRangeEnd },
          customerId: { not: null },
        },
        select: {
          customerId: true,
          visitDate: true,
        }
      }),
      // 클레임 수
      prisma.customerClaim.groupBy({
        by: ['customerId'],
        _count: { id: true },
      }),
    ])

    // 고객별 잔여 정기권 + 최근 구매 + 기간 전 방문 병렬 조회
    const customerIds = customers.map(c => c.id)
    const [latestVisitsWithTickets, recentPurchases, preRangeVisitors] = await Promise.all([
      prisma.dailyVisitor.findMany({
        where: {
          customerId: { in: customerIds },
          OR: [
            { remainingTermTicket: { not: null } },
            { remainingTimePackage: { not: null } },
            { remainingFixedSeat: { not: null } },
          ],
        },
        select: {
          customerId: true,
          visitDate: true,
          remainingTermTicket: true,
          remainingTimePackage: true,
          remainingFixedSeat: true,
        },
        orderBy: { visitDate: 'desc' },
      }),
      prisma.customerPurchase.findMany({
        where: {
          ...branchFilter,
          purchaseDate: { gte: kstStartOfDay(getKSTDaysAgoStr(30)) },
          customerId: { in: customerIds },
        },
        select: {
          customerId: true,
          ticketName: true,
          amount: true,
        }
      }),
      // 기간 시작 전 마지막 방문 (복귀 고객 판별용)
      prisma.dailyVisitor.findMany({
        where: {
          customerId: { in: customerIds },
          visitDate: { lt: visitRangeStart },
        },
        select: {
          customerId: true,
          visitDate: true,
        },
        orderBy: { visitDate: 'desc' },
      }),
    ])

    // 고객별 가장 최근 잔여 정기권 정보만 저장
    const remainingTicketMap = new Map<string, { termTicket: string | null; timePackage: string | null; fixedSeat: string | null }>()
    latestVisitsWithTickets.forEach(v => {
      if (!v.customerId || remainingTicketMap.has(v.customerId)) return
      remainingTicketMap.set(v.customerId, {
        termTicket: v.remainingTermTicket,
        timePackage: v.remainingTimePackage,
        fixedSeat: v.remainingFixedSeat,
      })
    })

    // 방문 수 계산
    const customerVisitDates = new Map<string, Set<string>>()
    recentVisitors.forEach(v => {
      if (!v.customerId) return
      const dateStr = v.visitDate.toISOString().split('T')[0]
      if (!customerVisitDates.has(v.customerId)) {
        customerVisitDates.set(v.customerId, new Set())
      }
      customerVisitDates.get(v.customerId)!.add(dateStr)
    })

    // 클레임 수 맵
    const claimCountMap = new Map<string, number>()
    claimCounts.forEach(c => {
      claimCountMap.set(c.customerId, c._count.id)
    })

    // 기간 시작 전 고객별 마지막 방문일 (복귀 판별용)
    const preRangeLastVisit = new Map<string, Date>()
    preRangeVisitors.forEach(v => {
      if (!v.customerId || preRangeLastVisit.has(v.customerId)) return
      preRangeLastVisit.set(v.customerId, v.visitDate)
    })

    // 구매 데이터 맵
    const purchaseMap = new Map<string, { ticketName: string; amount: number }[]>()
    recentPurchases.forEach(p => {
      if (!purchaseMap.has(p.customerId)) {
        purchaseMap.set(p.customerId, [])
      }
      purchaseMap.get(p.customerId)!.push({
        ticketName: p.ticketName,
        amount: decimalToNumber(p.amount),
      })
    })

    // 세그먼트 분류 및 필터 적용
    let items: CustomerListItem[] = customers.map(c => {
      const recentVisits = customerVisitDates.get(c.id)?.size || 0
      const claimCount = claimCountMap.get(c.id) || 0
      const purchases = purchaseMap.get(c.id) || []
      const favoriteTicketType = calculateFavoriteTicketType(purchases)
      const remaining = remainingTicketMap.get(c.id)

      const hasFixedSeat = !!(remaining?.fixedSeat && remaining.fixedSeat.trim() !== '')
      const vSeg = calculateVisitSegment({
        lastVisitDate: c.lastVisitDate,
        firstVisitDate: c.firstVisitDate,
        recentVisits,
        referenceDate: visitRangeEnd,
        rangeStart: visitRangeStart,
        previousLastVisitDate: preRangeLastVisit.get(c.id) || null,
        hasRemainingFixedSeat: hasFixedSeat,
      })
      const tSeg = calculateTicketSegment({
        hasRemainingTermTicket: !!(remaining?.termTicket && remaining.termTicket.trim() !== ''),
        hasRemainingTimePackage: !!(remaining?.timePackage && remaining.timePackage.trim() !== ''),
        hasRemainingFixedSeat: !!(remaining?.fixedSeat && remaining.fixedSeat.trim() !== ''),
      })

      return {
        id: c.id,
        phone: c.phone,
        gender: c.gender,
        ageGroup: c.ageGroup,
        firstVisitDate: c.firstVisitDate.toISOString().split('T')[0],
        lastVisitDate: c.lastVisitDate?.toISOString().split('T')[0] || null,
        totalVisits: c.totalVisits,
        totalSpent: decimalToNumber(c.totalSpent),
        visitSegment: vSeg,
        ticketSegment: tSeg,
        claimCount,
        recentVisits,
        favoriteTicketType,
        remainingTickets: remaining || null,
      }
    })

    // 세그먼트 필터
    if (visitSegment) {
      items = items.filter(i => i.visitSegment === visitSegment)
    }
    if (ticketSegment) {
      items = items.filter(i => i.ticketSegment === ticketSegment)
    }

    // 클레임 필터
    if (hasClaim === 'true') {
      items = items.filter(i => i.claimCount > 0)
    } else if (hasClaim === 'false') {
      items = items.filter(i => i.claimCount === 0)
    }

    // 정렬
    items.sort((a, b) => {
      let aVal: number | string | null
      let bVal: number | string | null

      switch (sortBy) {
        case 'totalVisits':
          aVal = a.totalVisits; bVal = b.totalVisits; break
        case 'totalSpent':
          aVal = a.totalSpent; bVal = b.totalSpent; break
        case 'recentVisits':
          aVal = a.recentVisits; bVal = b.recentVisits; break
        case 'lastVisitDate':
        default:
          aVal = a.lastVisitDate || ''; bVal = b.lastVisitDate || ''; break
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })

    // 페이지네이션
    const total = items.length
    const totalPages = Math.ceil(total / limit)
    const paginatedItems = items.slice((page - 1) * limit, page * limit)

    const response: PaginatedResponse<CustomerListItem> = {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
