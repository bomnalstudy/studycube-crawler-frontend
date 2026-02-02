import type {
  EventPerformanceData,
  ExternalFactorListItem,
  SegmentMigration,
  TicketUpgradeData,
} from '@/types/strategy'

export interface AnalysisSummary {
  avgRevenueGrowth: number
  avgVisitsGrowth: number
  avgPerformanceScore: number
  totalBranches: number
  significantCount: number
  totalNewCustomers: number
  totalReturnedCustomers: number
  segmentMigrations: SegmentMigration[]
  ticketUpgrades: TicketUpgradeData[]
}

export interface AnalysisResponse {
  event: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
    types: { type: string; subType: string }[]
    branches: { id: string; name: string }[]
  }
  performances: EventPerformanceData[]
  externalFactors: ExternalFactorListItem[]
  dataAvailability: {
    branchId: string
    branchName: string
    hasYoyData: boolean
    oldestDataDate: string
  }[]
  summary: AnalysisSummary
}
