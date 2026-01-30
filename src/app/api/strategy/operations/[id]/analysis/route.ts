import { NextRequest, NextResponse } from 'next/server'
import type {
  OperationPerformanceData,
  VerdictType,
  ComparisonType,
  SegmentChangeData,
  SegmentMigration,
  TicketTypeChangeData,
  TicketUpgradeData,
  VisitPatternData,
} from '@/types/strategy'

// 세그먼트 변화 더미 데이터 생성
function generateSegmentChanges(): SegmentChangeData[] {
  const segments = ['VIP', '단골', '일반', '이탈위험', '휴면']
  return segments.map((segmentName) => {
    const countBefore = Math.floor(Math.random() * 50) + 20
    const changePercent = (Math.random() - 0.3) * 30 // -10% ~ +20%
    const countAfter = Math.round(countBefore * (1 + changePercent / 100))
    return {
      segmentName,
      countBefore,
      countAfter,
      change: countAfter - countBefore,
      changePercent: Number(changePercent.toFixed(1)),
    }
  })
}

// 세그먼트 이동 더미 데이터 생성
function generateSegmentMigrations(): SegmentMigration[] {
  return [
    { fromSegment: '일반', toSegment: '단골', count: Math.floor(Math.random() * 15) + 5, isPositive: true },
    { fromSegment: '이탈위험', toSegment: '일반', count: Math.floor(Math.random() * 10) + 3, isPositive: true },
    { fromSegment: '휴면', toSegment: '일반', count: Math.floor(Math.random() * 8) + 2, isPositive: true },
    { fromSegment: '단골', toSegment: 'VIP', count: Math.floor(Math.random() * 5) + 1, isPositive: true },
    { fromSegment: '일반', toSegment: '이탈위험', count: Math.floor(Math.random() * 8) + 2, isPositive: false },
    { fromSegment: '단골', toSegment: '일반', count: Math.floor(Math.random() * 5) + 1, isPositive: false },
  ]
}

// 이용권 변화 더미 데이터 생성
function generateTicketTypeChanges(): TicketTypeChangeData[] {
  const ticketTypes = ['당일권', '시간권', '기간권', '고정석']
  return ticketTypes.map((ticketType) => {
    const revenueBefore = Math.floor(Math.random() * 3000000) + 1000000
    const revenueChangePercent = (Math.random() - 0.3) * 40 // -12% ~ +28%
    const revenueAfter = Math.round(revenueBefore * (1 + revenueChangePercent / 100))

    const buyersBefore = Math.floor(Math.random() * 100) + 30
    const buyersChangePercent = (Math.random() - 0.3) * 30
    const buyersAfter = Math.round(buyersBefore * (1 + buyersChangePercent / 100))

    return {
      ticketType,
      revenueBefore,
      revenueAfter,
      revenueChange: revenueAfter - revenueBefore,
      revenueChangePercent: Number(revenueChangePercent.toFixed(1)),
      buyersBefore,
      buyersAfter,
      buyersChange: buyersAfter - buyersBefore,
    }
  })
}

// 이용권 업그레이드 더미 데이터 생성
function generateTicketUpgrades(): TicketUpgradeData[] {
  return [
    {
      fromTicket: '당일권',
      toTicket: '시간권',
      count: Math.floor(Math.random() * 20) + 5,
      upgradeRate: Number((Math.random() * 15 + 5).toFixed(1)),
    },
    {
      fromTicket: '당일권',
      toTicket: '기간권',
      count: Math.floor(Math.random() * 10) + 2,
      upgradeRate: Number((Math.random() * 8 + 2).toFixed(1)),
    },
    {
      fromTicket: '시간권',
      toTicket: '기간권',
      count: Math.floor(Math.random() * 15) + 3,
      upgradeRate: Number((Math.random() * 12 + 3).toFixed(1)),
    },
    {
      fromTicket: '기간권',
      toTicket: '고정석',
      count: Math.floor(Math.random() * 8) + 1,
      upgradeRate: Number((Math.random() * 10 + 2).toFixed(1)),
    },
  ]
}

// 방문 패턴 더미 데이터 생성
function generateVisitPattern(): VisitPatternData {
  const avgVisitsPerCustomerBefore = Number((Math.random() * 3 + 2).toFixed(1))
  const visitChange = (Math.random() - 0.3) * 30
  const avgVisitsPerCustomerAfter = Number((avgVisitsPerCustomerBefore * (1 + visitChange / 100)).toFixed(1))

  const avgUsageTimeBefore = Math.floor(Math.random() * 60) + 120 // 120-180분
  const usageChange = (Math.random() - 0.2) * 20
  const avgUsageTimeAfter = Math.floor(avgUsageTimeBefore * (1 + usageChange / 100))

  return {
    avgVisitsPerCustomerBefore,
    avgVisitsPerCustomerAfter,
    visitFrequencyChange: Number(visitChange.toFixed(1)),
    avgUsageTimeBefore,
    avgUsageTimeAfter,
    usageTimeChange: Number(usageChange.toFixed(1)),
    peakHourBefore: Math.floor(Math.random() * 6) + 14, // 14-20시
    peakHourAfter: Math.floor(Math.random() * 6) + 14,
  }
}

// 더미 성과 데이터 생성 (실제로는 daily_metrics 테이블에서 계산)
function generatePerformanceData(
  operationId: string,
  branchId: string,
  branchName: string,
  implementedAt: string
): OperationPerformanceData {
  // 적용일 기준으로 전후 데이터 비교 (실제로는 DB 쿼리)
  const revenueBefore3m = Math.floor(Math.random() * 5000000) + 10000000
  const revenueAfter3m = Math.floor(Math.random() * 5000000) + 12000000
  const revenueGrowth3m = ((revenueAfter3m - revenueBefore3m) / revenueBefore3m) * 100

  const revenueBefore6m = Math.floor(Math.random() * 10000000) + 20000000
  const revenueAfter6m = Math.floor(Math.random() * 10000000) + 25000000
  const revenueGrowth6m = ((revenueAfter6m - revenueBefore6m) / revenueBefore6m) * 100

  const avgCustomersBefore = Math.floor(Math.random() * 50) + 100
  const avgCustomersAfter = Math.floor(Math.random() * 50) + 110
  const customerGrowth = ((avgCustomersAfter - avgCustomersBefore) / avgCustomersBefore) * 100

  // 세그먼트, 이용권, 방문 패턴 데이터
  const segmentChanges = generateSegmentChanges()
  const segmentMigrations = generateSegmentMigrations()
  const ticketTypeChanges = generateTicketTypeChanges()
  const ticketUpgrades = generateTicketUpgrades()
  const visitPattern = generateVisitPattern()

  // 신규/복귀 고객
  const newCustomers = Math.floor(Math.random() * 30) + 10
  const returnedCustomers = Math.floor(Math.random() * 15) + 5

  // 통계적 유의성 (실제로는 t-검정 수행)
  const pValue = Math.random() * 0.1
  const isSignificant = pValue < 0.05
  const effectSize = Math.random() * 1.2

  // 성과 점수 계산 (0-100)
  let performanceScore = 50
  performanceScore += Math.min(revenueGrowth3m * 2, 25) // 매출 성장률 기여
  performanceScore += Math.min(customerGrowth * 1.5, 15) // 고객 성장률 기여
  performanceScore += isSignificant ? 10 : 0 // 통계적 유의성 보너스

  // 긍정적 세그먼트 이동 보너스
  const positiveTransitions = segmentMigrations.filter((m) => m.isPositive).reduce((sum, m) => sum + m.count, 0)
  performanceScore += Math.min(positiveTransitions * 0.5, 10)

  // 이용권 업그레이드 보너스
  const totalUpgrades = ticketUpgrades.reduce((sum, u) => sum + u.count, 0)
  performanceScore += Math.min(totalUpgrades * 0.3, 10)

  performanceScore = Math.max(0, Math.min(100, performanceScore))

  // 평가
  let verdict: VerdictType = 'NEUTRAL'
  if (performanceScore >= 80) verdict = 'EXCELLENT'
  else if (performanceScore >= 65) verdict = 'GOOD'
  else if (performanceScore >= 45) verdict = 'NEUTRAL'
  else if (performanceScore >= 30) verdict = 'POOR'
  else verdict = 'FAILED'

  // 인사이트 생성
  const insights: string[] = []

  if (revenueGrowth3m > 10) {
    insights.push('매출이 전년 대비 유의미하게 증가했습니다.')
  } else if (revenueGrowth3m < -5) {
    insights.push('매출이 감소했습니다. 원인 분석이 필요합니다.')
  }

  if (customerGrowth > 5) {
    insights.push('고객 수가 증가하여 운영 변경의 긍정적 효과가 확인됩니다.')
  }

  // 세그먼트 이동 인사이트
  const toVipCount = segmentMigrations.find((m) => m.toSegment === 'VIP')?.count || 0
  const toRegularFromRisk = segmentMigrations.find((m) => m.fromSegment === '이탈위험' && m.toSegment === '일반')?.count || 0

  if (toVipCount > 3) {
    insights.push(`${toVipCount}명의 고객이 VIP로 승급했습니다.`)
  }
  if (toRegularFromRisk > 5) {
    insights.push(`${toRegularFromRisk}명의 이탈위험 고객이 일반 고객으로 복귀했습니다.`)
  }

  // 이용권 업그레이드 인사이트
  const periodUpgrades = ticketUpgrades.find((u) => u.toTicket === '기간권')
  if (periodUpgrades && periodUpgrades.count > 5) {
    insights.push(`${periodUpgrades.count}명이 기간권으로 업그레이드했습니다. (업그레이드율 ${periodUpgrades.upgradeRate}%)`)
  }

  // 방문 패턴 인사이트
  if (visitPattern.visitFrequencyChange > 10) {
    insights.push(`고객당 평균 방문 횟수가 ${visitPattern.visitFrequencyChange.toFixed(1)}% 증가했습니다.`)
  }
  if (visitPattern.usageTimeChange > 10) {
    insights.push(`평균 이용 시간이 ${visitPattern.usageTimeChange.toFixed(1)}% 증가했습니다.`)
  }

  if (returnedCustomers > 10) {
    insights.push(`${returnedCustomers}명의 휴면 고객이 복귀했습니다.`)
  }

  if (isSignificant) {
    insights.push('변화가 통계적으로 유의미합니다 (p < 0.05).')
  }

  return {
    id: `perf-${operationId}-${branchId}`,
    operationId,
    branchId,
    branchName,
    calculatedAt: new Date().toISOString(),
    comparisonType: 'YOY' as ComparisonType,

    revenueBefore3m,
    revenueAfter3m,
    revenueGrowth3m,

    revenueBefore6m,
    revenueAfter6m,
    revenueGrowth6m,

    avgCustomersBefore,
    avgCustomersAfter,
    customerGrowth,

    segmentChanges,
    segmentMigrations,
    ticketTypeChanges,
    ticketUpgrades,
    visitPattern,

    newCustomers,
    returnedCustomers,

    isSignificant,
    pValue,
    effectSize,

    performanceScore: Math.round(performanceScore),
    verdict,
    insights,
  }
}

// 더미 운영 변경 데이터
const DUMMY_OPERATIONS: Record<
  string,
  { id: string; name: string; implementedAt: string; cost?: number; branches: { id: string; name: string }[] }
> = {
  '1': {
    id: '1',
    name: '프리미엄 좌석 도입',
    implementedAt: '2025-01-15',
    cost: 5000000,
    branches: [{ id: '1', name: '강남점' }],
  },
  '2': {
    id: '2',
    name: '조명 시스템 개선',
    implementedAt: '2025-02-01',
    cost: 3000000,
    branches: [
      { id: '1', name: '강남점' },
      { id: '2', name: '홍대점' },
    ],
  },
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const operation = DUMMY_OPERATIONS[id]

    if (!operation) {
      return NextResponse.json({ error: '운영 변경을 찾을 수 없습니다' }, { status: 404 })
    }

    // 지점별 성과 데이터 생성
    const performances = operation.branches.map((branch) =>
      generatePerformanceData(operation.id, branch.id, branch.name, operation.implementedAt)
    )

    // 전체 평균 계산
    const avgGrowth3m = performances.reduce((sum, p) => sum + p.revenueGrowth3m, 0) / performances.length
    const avgGrowth6m = performances.reduce((sum, p) => sum + (p.revenueGrowth6m || 0), 0) / performances.length
    const avgCustomerGrowth = performances.reduce((sum, p) => sum + p.customerGrowth, 0) / performances.length
    const avgScore = performances.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / performances.length

    // 전체 세그먼트 이동 집계
    const totalSegmentMigrations = performances.reduce(
      (acc, p) => {
        p.segmentMigrations?.forEach((m) => {
          const key = `${m.fromSegment}→${m.toSegment}`
          if (!acc[key]) {
            acc[key] = { ...m, count: 0 }
          }
          acc[key].count += m.count
        })
        return acc
      },
      {} as Record<string, SegmentMigration>
    )

    // 전체 이용권 업그레이드 집계
    const totalTicketUpgrades = performances.reduce(
      (acc, p) => {
        p.ticketUpgrades?.forEach((u) => {
          const key = `${u.fromTicket}→${u.toTicket}`
          if (!acc[key]) {
            acc[key] = { ...u, count: 0 }
          }
          acc[key].count += u.count
        })
        return acc
      },
      {} as Record<string, TicketUpgradeData>
    )

    return NextResponse.json({
      operation: {
        id: operation.id,
        name: operation.name,
        implementedAt: operation.implementedAt,
        cost: operation.cost,
        branches: operation.branches,
      },
      performances,
      summary: {
        avgRevenueGrowth3m: avgGrowth3m,
        avgRevenueGrowth6m: avgGrowth6m,
        avgCustomerGrowth,
        avgPerformanceScore: avgScore,
        totalBranches: performances.length,
        significantCount: performances.filter((p) => p.isSignificant).length,
        totalNewCustomers: performances.reduce((sum, p) => sum + (p.newCustomers || 0), 0),
        totalReturnedCustomers: performances.reduce((sum, p) => sum + (p.returnedCustomers || 0), 0),
        segmentMigrations: Object.values(totalSegmentMigrations),
        ticketUpgrades: Object.values(totalTicketUpgrades),
      },
    })
  } catch (error) {
    console.error('Error fetching operation analysis:', error)
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 })
  }
}
