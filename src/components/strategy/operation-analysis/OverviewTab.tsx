import type { OperationPerformanceData } from '@/types/strategy'
import { OverviewTab as SharedOverviewTab } from '@/components/strategy/shared'
import type { PerformanceOverviewData } from '@/components/strategy/shared'

interface OverviewTabProps {
  performances: OperationPerformanceData[]
  selectedPeriod: '1m' | '3m' | '6m'
}

/** 선택된 기간에 따라 OperationPerformanceData → 공유 PerformanceOverviewData 변환 */
function toOverviewData(
  perf: OperationPerformanceData,
  period: '1m' | '3m' | '6m',
): PerformanceOverviewData {
  // 기간별 매출 데이터 선택
  let revenueBefore: number
  let revenueAfter: number
  let revenueGrowth: number

  if (period === '1m') {
    revenueBefore = perf.revenueBefore1m ?? 0
    revenueAfter = perf.revenueAfter1m ?? 0
    revenueGrowth = perf.revenueGrowth1m ?? 0
  } else if (period === '6m') {
    revenueBefore = perf.revenueBefore6m ?? 0
    revenueAfter = perf.revenueAfter6m ?? 0
    revenueGrowth = perf.revenueGrowth6m ?? 0
  } else {
    revenueBefore = perf.revenueBefore3m
    revenueAfter = perf.revenueAfter3m
    revenueGrowth = perf.revenueGrowth3m
  }

  return {
    id: perf.id,
    branchId: perf.branchId,
    branchName: perf.branchName,
    comparisonType: perf.comparisonType,
    revenueBefore,
    revenueAfter,
    revenueGrowth,
    visitsBefore: perf.visitsBefore ?? 0,
    visitsAfter: perf.visitsAfter ?? 0,
    visitsGrowth: perf.visitsGrowth ?? 0,
    newCustomers: perf.newCustomers ?? 0,
    returnedCustomers: perf.returnedCustomers ?? 0,
    dayTicketRevenue: perf.dayTicketRevenue,
    dayTicketRevenueBefore: perf.dayTicketRevenueBefore,
    timeTicketRevenue: perf.timeTicketRevenue,
    timeTicketRevenueBefore: perf.timeTicketRevenueBefore,
    termTicketRevenue: perf.termTicketRevenue,
    termTicketRevenueBefore: perf.termTicketRevenueBefore,
    fixedTicketRevenue: perf.fixedTicketRevenue,
    fixedTicketRevenueBefore: perf.fixedTicketRevenueBefore,
    forecast: perf.forecast,
    useForecast: perf.useForecast,
    isNewBranch: perf.isNewBranch,
    noYoyDataReason: perf.noYoyDataReason,
    isSignificant: perf.isSignificant,
    pValue: perf.pValue,
    effectSize: perf.effectSize,
    scoreBreakdown: perf.scoreBreakdown,
    performanceScore: perf.performanceScore,
    verdict: perf.verdict,
    insights: perf.insights,
  }
}

export function OverviewTab({ performances, selectedPeriod }: OverviewTabProps) {
  const overviewData = performances.map((p) => toOverviewData(p, selectedPeriod))
  return (
    <SharedOverviewTab
      performances={overviewData}
      contextLabel="운영변경"
    />
  )
}
