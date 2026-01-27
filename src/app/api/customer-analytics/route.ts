import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
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

    const startDate = startDateParam ? new Date(startDateParam) : new Date()
    const endDate = endDateParam ? new Date(endDateParam) : new Date()

    const branchFilter = getBranchFilter(session, requestedBranchId)

    // ticket_buyers 데이터 조회 (매출 정보 + customers 테이블에서 성별/연령대 JOIN)
    let ticketBuyers: any[]

    if (branchFilter.branchId) {
      // 특정 지점
      ticketBuyers = await prisma.$queryRaw`
        SELECT
          tb."customerHash",
          c."gender",
          c."ageGroup",
          tb."ticketName",
          tb."date",
          tb."branchId",
          tr."revenue"
        FROM ticket_buyers tb
        LEFT JOIN ticket_revenue tr ON tb."ticketRevenueId" = tr."id"
        LEFT JOIN customers c ON tb."phone" = c."phone"
        WHERE tb."branchId" = ${branchFilter.branchId}
          AND tb."date" >= ${startDate}
          AND tb."date" <= ${endDate}
        ORDER BY tb."date" ASC
      `
    } else {
      // 전체 지점
      ticketBuyers = await prisma.$queryRaw`
        SELECT
          tb."customerHash",
          c."gender",
          c."ageGroup",
          tb."ticketName",
          tb."date",
          tb."branchId",
          tr."revenue"
        FROM ticket_buyers tb
        LEFT JOIN ticket_revenue tr ON tb."ticketRevenueId" = tr."id"
        LEFT JOIN customers c ON tb."phone" = c."phone"
        WHERE tb."date" >= ${startDate}
          AND tb."date" <= ${endDate}
        ORDER BY tb."date" ASC
      `
    }

    // 1. 연령대별 LTV 분석
    const ltvByAge = calculateLTVBySegment(ticketBuyers, 'ageGroup')

    // 2. 성별 LTV 분석
    const ltvByGender = calculateLTVBySegment(ticketBuyers, 'gender')

    // 3. 행동 패턴별 LTV 분석 (구매 빈도 기준)
    const ltvByBehavior = calculateLTVByBehavior(ticketBuyers)

    // 4. 이용권 타입별 재구매 주기 분석
    const repurchaseCycle = calculateRepurchaseCycle(ticketBuyers)

    // 5. 고객 세그먼트 분석
    const customerSegments = analyzeCustomerSegments(ticketBuyers)

    // 6. 연령+성별 복합 LTV 분석
    const ltvByAgeGender = calculateLTVByAgeGender(ticketBuyers)

    // 7. 연령+성별+행동패턴 복합 LTV 분석
    const ltvByAgeGenderBehavior = calculateLTVByAgeGenderBehavior(ticketBuyers)

    return NextResponse.json({
      success: true,
      data: {
        ltvByAge,
        ltvByGender,
        ltvByBehavior,
        repurchaseCycle,
        customerSegments,
        ltvByAgeGender,
        ltvByAgeGenderBehavior
      }
    })
  } catch (error) {
    console.error('Failed to fetch customer analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer analytics' },
      { status: 500 }
    )
  }
}

// 세그먼트별 LTV 계산 (연령대 또는 성별)
function calculateLTVBySegment(buyers: any[], segmentKey: string) {
  const segmentMap = new Map<string, {
    totalCustomers: Set<string>
    totalPurchases: number
    totalRevenue: number
    customerRevenue: Map<string, number>
  }>()

  buyers.forEach(buyer => {
    const segment = buyer[segmentKey] || '미상'
    if (!segmentMap.has(segment)) {
      segmentMap.set(segment, {
        totalCustomers: new Set(),
        totalPurchases: 0,
        totalRevenue: 0,
        customerRevenue: new Map()
      })
    }

    const data = segmentMap.get(segment)!
    data.totalCustomers.add(buyer.customerHash)
    data.totalPurchases++

    // 실제 매출 데이터 집계
    const revenue = buyer.revenue ? parseFloat(buyer.revenue.toString()) : 0
    data.totalRevenue += revenue

    // 고객별 매출 집계
    const customerHash = buyer.customerHash
    const currentRevenue = data.customerRevenue.get(customerHash) || 0
    data.customerRevenue.set(customerHash, currentRevenue + revenue)
  })

  // LTV 계산 (실제 데이터 기반)
  const result = Array.from(segmentMap.entries()).map(([segment, data]) => {
    const avgPurchasePerCustomer = data.totalPurchases / data.totalCustomers.size
    const avgRevenuePerCustomer = data.totalRevenue / data.totalCustomers.size
    const avgRevenuePerPurchase = data.totalPurchases > 0 ? data.totalRevenue / data.totalPurchases : 0

    return {
      segment,
      totalCustomers: data.totalCustomers.size,
      totalPurchases: data.totalPurchases,
      avgPurchasePerCustomer: Math.round(avgPurchasePerCustomer * 10) / 10,
      avgRevenuePerPurchase: Math.round(avgRevenuePerPurchase),
      totalRevenue: Math.round(data.totalRevenue),
      estimatedLTV: Math.round(avgRevenuePerCustomer)
    }
  })

  return result.sort((a, b) => b.estimatedLTV - a.estimatedLTV)
}

// 행동 패턴별 LTV 분석 (구매 빈도 기준)
function calculateLTVByBehavior(buyers: any[]) {
  const customerData = new Map<string, {
    purchaseCount: number
    totalRevenue: number
  }>()

  buyers.forEach(buyer => {
    const hash = buyer.customerHash
    if (!customerData.has(hash)) {
      customerData.set(hash, {
        purchaseCount: 0,
        totalRevenue: 0
      })
    }

    const data = customerData.get(hash)!
    data.purchaseCount++
    data.totalRevenue += buyer.revenue ? parseFloat(buyer.revenue.toString()) : 0
  })

  // 구매 빈도별 그룹화
  const behaviorGroups = new Map<string, {
    customerCount: number
    totalPurchases: number
    totalRevenue: number
  }>()

  const groupNames = ['1회 구매', '2-3회 구매', '4-5회 구매', '6-10회 구매', '11회 이상']
  groupNames.forEach(name => {
    behaviorGroups.set(name, {
      customerCount: 0,
      totalPurchases: 0,
      totalRevenue: 0
    })
  })

  customerData.forEach((data) => {
    let groupName = ''
    if (data.purchaseCount === 1) groupName = '1회 구매'
    else if (data.purchaseCount <= 3) groupName = '2-3회 구매'
    else if (data.purchaseCount <= 5) groupName = '4-5회 구매'
    else if (data.purchaseCount <= 10) groupName = '6-10회 구매'
    else groupName = '11회 이상'

    const group = behaviorGroups.get(groupName)!
    group.customerCount++
    group.totalPurchases += data.purchaseCount
    group.totalRevenue += data.totalRevenue
  })

  return Array.from(behaviorGroups.entries()).map(([behavior, data]) => {
    const avgPurchases = data.customerCount > 0 ? data.totalPurchases / data.customerCount : 0
    const avgLTV = data.customerCount > 0 ? data.totalRevenue / data.customerCount : 0

    return {
      behavior,
      customerCount: data.customerCount,
      avgPurchases: Math.round(avgPurchases * 10) / 10,
      avgRevenuePerPurchase: data.totalPurchases > 0 ? Math.round(data.totalRevenue / data.totalPurchases) : 0,
      estimatedLTV: Math.round(avgLTV)
    }
  })
}

// 재구매 주기 분석 (이용권 타입별)
function calculateRepurchaseCycle(buyers: any[]) {
  // 전체 재구매 주기
  const customerPurchaseDates = new Map<string, Date[]>()

  // 정기권 재구매 주기 (기간권/시간권)
  const periodTicketDates = new Map<string, Date[]>()

  // 당일권 재구매 주기
  const dayTicketDates = new Map<string, Date[]>()

  buyers.forEach(buyer => {
    const hash = buyer.customerHash
    const date = new Date(buyer.date)
    const ticketName = buyer.ticketName || ''

    // 전체
    if (!customerPurchaseDates.has(hash)) {
      customerPurchaseDates.set(hash, [])
    }
    customerPurchaseDates.get(hash)!.push(date)

    // 정기권 (기간권, 시간권)
    if (ticketName.includes('기간권') || ticketName.includes('시간권')) {
      if (!periodTicketDates.has(hash)) {
        periodTicketDates.set(hash, [])
      }
      periodTicketDates.get(hash)!.push(date)
    }

    // 당일권
    if (ticketName.includes('당일권')) {
      if (!dayTicketDates.has(hash)) {
        dayTicketDates.set(hash, [])
      }
      dayTicketDates.get(hash)!.push(date)
    }
  })

  const calculateCycleStats = (dateMap: Map<string, Date[]>) => {
    const intervals: number[] = []

    dateMap.forEach(dates => {
      if (dates.length < 2) return

      dates.sort((a, b) => a.getTime() - b.getTime())

      for (let i = 1; i < dates.length; i++) {
        const daysDiff = Math.round(
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        )
        intervals.push(daysDiff)
      }
    })

    if (intervals.length === 0) {
      return {
        avgDays: 0,
        medianDays: 0,
        repeatRate: 0,
        totalCustomers: dateMap.size,
        repeatCustomers: 0
      }
    }

    const avgDays = Math.round(
      intervals.reduce((sum, days) => sum + days, 0) / intervals.length
    )

    intervals.sort((a, b) => a - b)
    const medianDays = intervals[Math.floor(intervals.length / 2)]

    const repeatCustomers = Array.from(dateMap.values())
      .filter(dates => dates.length > 1).length
    const repeatRate = Math.round((repeatCustomers / dateMap.size) * 100)

    return {
      avgDays,
      medianDays,
      repeatRate,
      totalCustomers: dateMap.size,
      repeatCustomers
    }
  }

  return {
    overall: {
      ...calculateCycleStats(customerPurchaseDates),
      label: '전체'
    },
    periodTicket: {
      ...calculateCycleStats(periodTicketDates),
      label: '정기권 (기간권/시간권)'
    },
    dayTicket: {
      ...calculateCycleStats(dayTicketDates),
      label: '당일권'
    }
  }
}

// 고객 세그먼트 분석
function analyzeCustomerSegments(buyers: any[]) {
  const customerData = new Map<string, {
    purchases: number
    lastPurchase: Date
    tickets: Set<string>
    age: string
    gender: string
  }>()

  buyers.forEach(buyer => {
    const hash = buyer.customerHash
    if (!customerData.has(hash)) {
      customerData.set(hash, {
        purchases: 0,
        lastPurchase: new Date(buyer.date),
        tickets: new Set(),
        age: buyer.ageGroup || '미상',
        gender: buyer.gender || '미상'
      })
    }

    const data = customerData.get(hash)!
    data.purchases++
    data.tickets.add(buyer.ticketName)

    const currentDate = new Date(buyer.date)
    if (currentDate > data.lastPurchase) {
      data.lastPurchase = currentDate
    }
  })

  // 세그먼트 분류
  const segments = {
    vip: 0,        // 11회 이상
    loyal: 0,      // 6-10회
    regular: 0,    // 3-5회
    occasional: 0, // 2회
    oneTime: 0     // 1회
  }

  customerData.forEach(data => {
    if (data.purchases >= 11) segments.vip++
    else if (data.purchases >= 6) segments.loyal++
    else if (data.purchases >= 3) segments.regular++
    else if (data.purchases === 2) segments.occasional++
    else segments.oneTime++
  })

  return Object.entries(segments).map(([segment, count]) => ({
    segment,
    count,
    percentage: Math.round((count / customerData.size) * 100)
  }))
}

// 연령+성별 복합 LTV 분석
function calculateLTVByAgeGender(buyers: any[]) {
  const segmentMap = new Map<string, {
    totalCustomers: Set<string>
    totalPurchases: number
    totalRevenue: number
    customerRevenue: Map<string, number>
  }>()

  buyers.forEach(buyer => {
    const age = buyer.ageGroup || '미상'
    const gender = buyer.gender || '미상'
    const segment = `${age} ${gender}`

    if (!segmentMap.has(segment)) {
      segmentMap.set(segment, {
        totalCustomers: new Set(),
        totalPurchases: 0,
        totalRevenue: 0,
        customerRevenue: new Map()
      })
    }

    const data = segmentMap.get(segment)!
    data.totalCustomers.add(buyer.customerHash)
    data.totalPurchases++

    const revenue = buyer.revenue ? parseFloat(buyer.revenue.toString()) : 0
    data.totalRevenue += revenue

    const customerHash = buyer.customerHash
    const currentRevenue = data.customerRevenue.get(customerHash) || 0
    data.customerRevenue.set(customerHash, currentRevenue + revenue)
  })

  const result = Array.from(segmentMap.entries()).map(([segment, data]) => {
    const avgPurchasePerCustomer = data.totalPurchases / data.totalCustomers.size
    const avgRevenuePerCustomer = data.totalRevenue / data.totalCustomers.size
    const avgRevenuePerPurchase = data.totalPurchases > 0 ? data.totalRevenue / data.totalPurchases : 0

    return {
      segment,
      totalCustomers: data.totalCustomers.size,
      totalPurchases: data.totalPurchases,
      avgPurchasePerCustomer: Math.round(avgPurchasePerCustomer * 10) / 10,
      avgRevenuePerPurchase: Math.round(avgRevenuePerPurchase),
      totalRevenue: Math.round(data.totalRevenue),
      estimatedLTV: Math.round(avgRevenuePerCustomer)
    }
  })

  return result.sort((a, b) => b.estimatedLTV - a.estimatedLTV).slice(0, 15) // Top 15
}

// 연령+성별+행동패턴 복합 LTV 분석
function calculateLTVByAgeGenderBehavior(buyers: any[]) {
  // 먼저 고객별 구매 횟수 및 매출 계산
  const customerPurchases = new Map<string, {
    count: number
    totalRevenue: number
    age: string
    gender: string
  }>()

  buyers.forEach(buyer => {
    const hash = buyer.customerHash
    if (!customerPurchases.has(hash)) {
      customerPurchases.set(hash, {
        count: 0,
        totalRevenue: 0,
        age: buyer.ageGroup || '미상',
        gender: buyer.gender || '미상'
      })
    }
    const data = customerPurchases.get(hash)!
    data.count++
    data.totalRevenue += buyer.revenue ? parseFloat(buyer.revenue.toString()) : 0
  })

  // 세그먼트별 집계
  const segmentMap = new Map<string, {
    customerCount: number
    totalPurchases: number
    totalRevenue: number
  }>()

  customerPurchases.forEach((data) => {
    let behavior = ''
    if (data.count === 1) behavior = '1회'
    else if (data.count <= 3) behavior = '2-3회'
    else if (data.count <= 5) behavior = '4-5회'
    else if (data.count <= 10) behavior = '6-10회'
    else behavior = '11회+'

    const segment = `${data.age} ${data.gender} (${behavior})`

    if (!segmentMap.has(segment)) {
      segmentMap.set(segment, {
        customerCount: 0,
        totalPurchases: 0,
        totalRevenue: 0
      })
    }

    const segData = segmentMap.get(segment)!
    segData.customerCount++
    segData.totalPurchases += data.count
    segData.totalRevenue += data.totalRevenue
  })

  const result = Array.from(segmentMap.entries()).map(([segment, data]) => {
    const avgPurchasePerCustomer = data.totalPurchases / data.customerCount
    const avgRevenuePerCustomer = data.totalRevenue / data.customerCount
    const avgRevenuePerPurchase = data.totalPurchases > 0 ? data.totalRevenue / data.totalPurchases : 0

    return {
      segment,
      customerCount: data.customerCount,
      avgPurchasePerCustomer: Math.round(avgPurchasePerCustomer * 10) / 10,
      avgRevenuePerPurchase: Math.round(avgRevenuePerPurchase),
      totalRevenue: Math.round(data.totalRevenue),
      estimatedLTV: Math.round(avgRevenuePerCustomer)
    }
  })

  return result.sort((a, b) => b.estimatedLTV - a.estimatedLTV).slice(0, 20) // Top 20
}
