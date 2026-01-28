import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment, calculateFavoriteTicketType } from '@/lib/crm/segment-calculator'
import { calculateCustomerStats } from '@/lib/crm/customer-stats-calculator'
import { CustomerDetail } from '@/types/crm'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 고객 기본 정보
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        mainBranch: { select: { name: true } },
      }
    })

    if (!customer) {
      return NextResponse.json({ success: false, error: '고객을 찾을 수 없습니다' }, { status: 404 })
    }

    const thirtyDaysAgo = kstStartOfDay(getKSTDaysAgoStr(30))

    // 병렬 쿼리
    const [purchases, visits, memos, claims, recentVisitorRecords, claimCount] = await Promise.all([
      // 구매 이력
      prisma.customerPurchase.findMany({
        where: { customerId: id },
        include: { branch: { select: { name: true } } },
        orderBy: { purchaseDate: 'desc' },
        take: 100,
      }),
      // 방문 이력
      prisma.dailyVisitor.findMany({
        where: { customerId: id },
        select: {
          id: true,
          visitDate: true,
          visitTime: true,
          duration: true,
          seat: true,
          startTime: true,
          remainingTermTicket: true,
          remainingTimePackage: true,
          remainingFixedSeat: true,
          branch: { select: { name: true } },
        },
        orderBy: { visitDate: 'desc' },
        take: 100,
      }),
      // 메모
      prisma.customerMemo.findMany({
        where: { customerId: id },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      // 클레임
      prisma.customerClaim.findMany({
        where: { customerId: id },
        include: {
          branch: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 30일 내 방문 기록
      prisma.dailyVisitor.findMany({
        where: {
          customerId: id,
          visitDate: { gte: thirtyDaysAgo },
        },
        select: { visitDate: true },
      }),
      // 클레임 수
      prisma.customerClaim.count({
        where: { customerId: id },
      }),
    ])

    // 30일 내 방문 수 (서로 다른 날짜)
    const recentVisitDates = new Set(
      recentVisitorRecords.map(v => v.visitDate.toISOString().split('T')[0])
    )
    const recentVisits = recentVisitDates.size

    // 세그먼트 분류
    const purchaseData = purchases.map(p => ({
      ticketName: p.ticketName,
      amount: decimalToNumber(p.amount),
    }))
    const favoriteTicketType = calculateFavoriteTicketType(purchaseData)

    // 가장 최근 방문의 잔여 이용권 확인
    const latestVisit = visits[0]

    // 30일 전 마지막 방문일 (복귀 판별용)
    const preThirtyDayVisits = visits.filter(v => v.visitDate < thirtyDaysAgo)
    const previousLastVisitDate = preThirtyDayVisits.length > 0 ? preThirtyDayVisits[0].visitDate : null

    const hasFixedSeat = !!(latestVisit?.remainingFixedSeat && latestVisit.remainingFixedSeat.trim() !== '')
    const visitSeg = calculateVisitSegment({
      lastVisitDate: customer.lastVisitDate,
      firstVisitDate: customer.firstVisitDate,
      recentVisits,
      previousLastVisitDate,
      hasRemainingFixedSeat: hasFixedSeat,
    })
    const ticketSeg = calculateTicketSegment({
      hasRemainingTermTicket: !!(latestVisit?.remainingTermTicket && latestVisit.remainingTermTicket.trim() !== ''),
      hasRemainingTimePackage: !!(latestVisit?.remainingTimePackage && latestVisit.remainingTimePackage.trim() !== ''),
      hasRemainingFixedSeat: !!(latestVisit?.remainingFixedSeat && latestVisit.remainingFixedSeat.trim() !== ''),
    })

    // 상세 통계 계산
    const stats = calculateCustomerStats(
      visits.map(v => ({
        visitDate: v.visitDate,
        duration: v.duration,
        startTime: v.startTime,
        seat: v.seat,
      })),
      purchases.map(p => ({
        purchaseDate: p.purchaseDate,
        ticketName: p.ticketName,
        amount: decimalToNumber(p.amount),
      }))
    )

    const detail: CustomerDetail = {
      id: customer.id,
      phone: customer.phone,
      gender: customer.gender,
      age: customer.age,
      ageGroup: customer.ageGroup,
      birthdate: customer.birthdate,
      firstVisitDate: customer.firstVisitDate.toISOString().split('T')[0],
      lastVisitDate: customer.lastVisitDate?.toISOString().split('T')[0] || null,
      lastPurchaseDate: customer.lastPurchaseDate?.toISOString().split('T')[0] || null,
      totalVisits: customer.totalVisits,
      totalSpent: decimalToNumber(customer.totalSpent),
      visitSegment: visitSeg,
      ticketSegment: ticketSeg,
      recentVisits,
      stats,
      purchases: purchases.map(p => ({
        id: p.id,
        purchaseDate: p.purchaseDate.toISOString().split('T')[0],
        ticketName: p.ticketName,
        amount: decimalToNumber(p.amount),
        pointUsed: p.pointUsed ? decimalToNumber(p.pointUsed) : null,
        branchName: p.branch.name,
      })),
      visits: visits.map(v => ({
        id: v.id,
        visitDate: v.visitDate.toISOString().split('T')[0],
        visitTime: v.visitTime,
        duration: v.duration,
        seat: v.seat,
        branchName: v.branch.name,
      })),
      memos: memos.map(m => ({
        id: m.id,
        content: m.content,
        createdBy: m.createdBy,
        authorName: m.author.name,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      claims: claims.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        status: c.status as 'OPEN' | 'RESOLVED' | 'CLOSED',
        branchName: c.branch.name,
        createdBy: c.createdBy,
        authorName: c.author.name,
        resolvedAt: c.resolvedAt?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    console.error('Failed to fetch customer detail:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer detail' },
      { status: 500 }
    )
  }
}
