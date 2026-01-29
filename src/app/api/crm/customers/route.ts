import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, kstEndOfDay, getKSTYesterdayStr, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment, calculateFavoriteTicketType } from '@/lib/crm/segment-calculator'
import { CustomerListItem, VisitSegment, TicketSegment, PaginatedResponse } from '@/types/crm'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// 세그먼트 필터 없이 기본 정렬 필드인 경우 빠른 경로 사용
const DB_SORTABLE_FIELDS = ['lastVisitDate', 'totalVisits', 'totalSpent', 'firstVisitDate']

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
    const minSegmentDays = searchParams.get('minSegmentDays') ? Number(searchParams.get('minSegmentDays')) : undefined
    const maxSegmentDays = searchParams.get('maxSegmentDays') ? Number(searchParams.get('maxSegmentDays')) : undefined
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

    // 세그먼트 필터 없고 DB 정렬 가능한 필드일 때 빠른 경로
    const needsSegmentFilter = visitSegment || ticketSegment || minSegmentDays !== undefined || maxSegmentDays !== undefined
    const canUseFastPath = !needsSegmentFilter && DB_SORTABLE_FIELDS.includes(sortBy)

    // Prisma where 조건
    const customerWhere: Prisma.CustomerWhereInput = {}
    if (branchFilter.branchId) {
      customerWhere.mainBranchId = branchFilter.branchId
    }
    if (ageGroup) customerWhere.ageGroup = ageGroup
    if (gender) customerWhere.gender = gender
    if (search) customerWhere.phone = { contains: search }

    // totalSpent 필터
    if (minSpent !== undefined || maxSpent !== undefined) {
      customerWhere.totalSpent = {}
      if (minSpent !== undefined) customerWhere.totalSpent.gte = minSpent
      if (maxSpent !== undefined) customerWhere.totalSpent.lte = maxSpent
    }

    // totalVisits 필터
    if (minVisits !== undefined || maxVisits !== undefined) {
      customerWhere.totalVisits = {}
      if (minVisits !== undefined) customerWhere.totalVisits.gte = minVisits
      if (maxVisits !== undefined) customerWhere.totalVisits.lte = maxVisits
    }

    // 클레임 필터 (DB 레벨)
    if (hasClaim === 'true') {
      customerWhere.claims = { some: {} }
    } else if (hasClaim === 'false') {
      customerWhere.claims = { none: {} }
    }

    // ===== 빠른 경로: 세그먼트 필터 없을 때 =====
    if (canUseFastPath) {
      const orderBy: Prisma.CustomerOrderByWithRelationInput = {}
      orderBy[sortBy as keyof Prisma.CustomerOrderByWithRelationInput] = sortOrder

      const [customers, total] = await Promise.all([
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
            _count: { select: { claims: true } },
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.customer.count({ where: customerWhere }),
      ])

      // 필요한 고객 ID만 추출
      const customerIds = customers.map(c => c.id)

      // 필요한 데이터만 병렬 조회
      const [recentVisitors, latestVisitsWithTickets, recentPurchases, preRangeVisitors] = await Promise.all([
        prisma.dailyVisitor.findMany({
          where: {
            customerId: { in: customerIds },
            visitDate: { gte: visitRangeStart, lte: visitRangeEnd },
          },
          select: { customerId: true, visitDate: true },
        }),
        prisma.dailyVisitor.findMany({
          where: { customerId: { in: customerIds } },
          distinct: ['customerId'],
          select: {
            customerId: true,
            remainingTermTicket: true,
            remainingTimePackage: true,
            remainingFixedSeat: true,
          },
          orderBy: { visitDate: 'desc' },
        }),
        prisma.customerPurchase.findMany({
          where: {
            customerId: { in: customerIds },
            purchaseDate: { gte: kstStartOfDay(getKSTDaysAgoStr(30)) },
          },
          select: { customerId: true, ticketName: true, amount: true },
        }),
        prisma.dailyVisitor.findMany({
          where: {
            customerId: { in: customerIds },
            visitDate: { lt: visitRangeStart },
          },
          distinct: ['customerId'],
          select: { customerId: true, visitDate: true },
          orderBy: { visitDate: 'desc' },
        }),
      ])

      // 맵 구성
      const customerVisitDates = new Map<string, Set<string>>()
      recentVisitors.forEach(v => {
        if (!v.customerId) return
        const dateStr = v.visitDate.toISOString().split('T')[0]
        if (!customerVisitDates.has(v.customerId)) customerVisitDates.set(v.customerId, new Set())
        customerVisitDates.get(v.customerId)!.add(dateStr)
      })

      const remainingTicketMap = new Map<string, { termTicket: string | null; timePackage: string | null; fixedSeat: string | null }>()
      latestVisitsWithTickets.forEach(v => {
        if (!v.customerId || remainingTicketMap.has(v.customerId)) return
        remainingTicketMap.set(v.customerId, {
          termTicket: v.remainingTermTicket,
          timePackage: v.remainingTimePackage,
          fixedSeat: v.remainingFixedSeat,
        })
      })

      const purchaseMap = new Map<string, { ticketName: string; amount: number }[]>()
      recentPurchases.forEach(p => {
        if (!purchaseMap.has(p.customerId)) purchaseMap.set(p.customerId, [])
        purchaseMap.get(p.customerId)!.push({ ticketName: p.ticketName, amount: decimalToNumber(p.amount) })
      })

      const preRangeLastVisit = new Map<string, Date>()
      preRangeVisitors.forEach(v => {
        if (!v.customerId || preRangeLastVisit.has(v.customerId)) return
        preRangeLastVisit.set(v.customerId, v.visitDate)
      })

      // 응답 데이터 변환
      const items: CustomerListItem[] = customers.map(c => {
        const recentVisits = customerVisitDates.get(c.id)?.size || 0
        const purchases = purchaseMap.get(c.id) || []
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
          hasRemainingFixedSeat: hasFixedSeat,
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
          claimCount: c._count.claims,
          recentVisits,
          segmentDays: null,
          favoriteTicketType: calculateFavoriteTicketType(purchases),
          remainingTickets: remaining || null,
        }
      })

      const response: PaginatedResponse<CustomerListItem> = {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }

      return NextResponse.json({ success: true, data: response })
    }

    // ===== 느린 경로: 세그먼트 필터 필요할 때 =====
    // 클레임 필터는 이미 위에서 DB 조건으로 처리됨 (hasClaim)
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
      prisma.dailyVisitor.findMany({
        where: {
          ...branchFilter,
          visitDate: { gte: visitRangeStart, lte: visitRangeEnd },
          customerId: { not: null },
        },
        select: { customerId: true, visitDate: true }
      }),
      prisma.customerClaim.groupBy({
        by: ['customerId'],
        _count: { id: true },
      }),
    ])

    const customerIds = customers.map(c => c.id)
    const [latestVisitsWithTickets, recentPurchases, preRangeVisitors] = await Promise.all([
      prisma.dailyVisitor.findMany({
        where: { customerId: { in: customerIds } },
        distinct: ['customerId'],
        select: {
          customerId: true,
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
        select: { customerId: true, ticketName: true, amount: true }
      }),
      prisma.dailyVisitor.findMany({
        where: {
          customerId: { in: customerIds },
          visitDate: { lt: visitRangeStart },
        },
        distinct: ['customerId'],
        select: { customerId: true, visitDate: true },
        orderBy: { visitDate: 'desc' },
      }),
    ])

    // 맵 구성
    const remainingTicketMap = new Map<string, { termTicket: string | null; timePackage: string | null; fixedSeat: string | null }>()
    latestVisitsWithTickets.forEach(v => {
      if (!v.customerId || remainingTicketMap.has(v.customerId)) return
      remainingTicketMap.set(v.customerId, {
        termTicket: v.remainingTermTicket,
        timePackage: v.remainingTimePackage,
        fixedSeat: v.remainingFixedSeat,
      })
    })

    const customerVisitDates = new Map<string, Set<string>>()
    recentVisitors.forEach(v => {
      if (!v.customerId) return
      const dateStr = v.visitDate.toISOString().split('T')[0]
      if (!customerVisitDates.has(v.customerId)) customerVisitDates.set(v.customerId, new Set())
      customerVisitDates.get(v.customerId)!.add(dateStr)
    })

    const claimCountMap = new Map<string, number>()
    claimCounts.forEach(c => claimCountMap.set(c.customerId, c._count.id))

    const preRangeLastVisit = new Map<string, Date>()
    preRangeVisitors.forEach(v => {
      if (!v.customerId || preRangeLastVisit.has(v.customerId)) return
      preRangeLastVisit.set(v.customerId, v.visitDate)
    })

    const purchaseMap = new Map<string, { ticketName: string; amount: number }[]>()
    recentPurchases.forEach(p => {
      if (!purchaseMap.has(p.customerId)) purchaseMap.set(p.customerId, [])
      purchaseMap.get(p.customerId)!.push({ ticketName: p.ticketName, amount: decimalToNumber(p.amount) })
    })

    // 세그먼트 분류 및 필터 적용
    let items: CustomerListItem[] = customers.map(c => {
      const recentVisits = customerVisitDates.get(c.id)?.size || 0
      const claimCount = claimCountMap.get(c.id) || 0
      const purchases = purchaseMap.get(c.id) || []
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
        hasRemainingFixedSeat: hasFixedSeat,
      })

      // 세그먼트 경과일 계산
      let segmentDays: number | null = null
      if (vSeg === 'new_0_7') {
        segmentDays = Math.floor((visitRangeEnd.getTime() - c.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      } else if (vSeg === 'at_risk_14' && c.lastVisitDate) {
        const daysSince = Math.floor((visitRangeEnd.getTime() - c.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
        segmentDays = daysSince - 13
      } else if (vSeg === 'churned' && c.lastVisitDate) {
        const daysSince = Math.floor((visitRangeEnd.getTime() - c.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
        segmentDays = daysSince - 29
      } else if (vSeg === 'returned') {
        const visitDates = customerVisitDates.get(c.id)
        if (visitDates && visitDates.size > 0) {
          const sorted = [...visitDates].sort()
          const firstRevisit = new Date(sorted[0] + 'T00:00:00+09:00')
          segmentDays = Math.floor((visitRangeEnd.getTime() - firstRevisit.getTime()) / (1000 * 60 * 60 * 24)) + 1
        }
      }

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
        segmentDays,
        favoriteTicketType: calculateFavoriteTicketType(purchases),
        remainingTickets: remaining || null,
      }
    })

    // 세그먼트 필터
    if (visitSegment) items = items.filter(i => i.visitSegment === visitSegment)
    if (ticketSegment) items = items.filter(i => i.ticketSegment === ticketSegment)

    // 세그먼트 경과일 필터
    if (minSegmentDays !== undefined || maxSegmentDays !== undefined) {
      items = items.filter(i => {
        if (i.segmentDays === null) return false
        if (minSegmentDays !== undefined && i.segmentDays < minSegmentDays) return false
        if (maxSegmentDays !== undefined && i.segmentDays > maxSegmentDays) return false
        return true
      })
    }

    // 정렬
    items.sort((a, b) => {
      let aVal: number | string | null
      let bVal: number | string | null

      switch (sortBy) {
        case 'totalVisits': aVal = a.totalVisits; bVal = b.totalVisits; break
        case 'totalSpent': aVal = a.totalSpent; bVal = b.totalSpent; break
        case 'recentVisits': aVal = a.recentVisits; bVal = b.recentVisits; break
        case 'segmentDays': aVal = a.segmentDays ?? -1; bVal = b.segmentDays ?? -1; break
        case 'lastVisitDate':
        default: aVal = a.lastVisitDate || ''; bVal = b.lastVisitDate || ''; break
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    // 페이지네이션
    const total = items.length
    const paginatedItems = items.slice((page - 1) * limit, page * limit)

    const response: PaginatedResponse<CustomerListItem> = {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 })
  }
}
