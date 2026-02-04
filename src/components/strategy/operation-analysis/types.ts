import type { SegmentMigration, TicketUpgradeData } from '@/types/strategy'

export interface OperationInfo {
  id: string
  name: string
  implementedAt: string
  cost?: number
  branches: { id: string; name: string }[]
}

export interface AnalysisSummary {
  avgRevenueGrowth1m: number
  avgRevenueGrowth3m: number
  avgRevenueGrowth6m: number
  avgCustomerGrowth: number
  avgPerformanceScore: number
  totalBranches: number
  significantCount: number
  totalNewCustomers: number
  totalReturnedCustomers: number
  segmentMigrations: SegmentMigration[]
  ticketUpgrades: TicketUpgradeData[]
}

export interface AnalysisData {
  operation: OperationInfo
  performances: import('@/types/strategy').OperationPerformanceData[]
  summary: AnalysisSummary
  fromCache?: boolean
  calculatedAt?: string
}
