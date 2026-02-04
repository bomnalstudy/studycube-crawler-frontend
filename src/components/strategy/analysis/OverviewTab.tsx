import type { EventPerformanceData } from '@/types/strategy'
import { OverviewTab as SharedOverviewTab } from '@/components/strategy/shared'
import type { PerformanceOverviewData, DataAvailabilityInfo } from '@/components/strategy/shared'

interface OverviewTabProps {
  performances: EventPerformanceData[]
  dataAvailability: DataAvailabilityInfo[]
}

/** EventPerformanceData → 공유 PerformanceOverviewData 변환 */
function toOverviewData(perf: EventPerformanceData): PerformanceOverviewData {
  return {
    id: perf.id,
    branchId: perf.branchId,
    branchName: perf.branchName,
    comparisonType: perf.comparisonType,
    revenueBefore: perf.revenueBefore,
    revenueAfter: perf.revenueAfter,
    revenueGrowth: perf.revenueGrowth,
    revenueGrowthAdjusted: perf.revenueGrowthAdjusted,
    visitsBefore: perf.visitsBefore,
    visitsAfter: perf.visitsAfter,
    visitsGrowth: perf.visitsGrowth,
    newCustomers: perf.newCustomers,
    returnedCustomers: perf.returnedCustomers,
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

export function OverviewTab({ performances, dataAvailability }: OverviewTabProps) {
  const overviewData = performances.map(toOverviewData)
  return (
    <SharedOverviewTab
      performances={overviewData}
      dataAvailability={dataAvailability}
      contextLabel="이벤트"
    />
  )
}
