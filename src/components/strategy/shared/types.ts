import type {
  ComparisonType,
  ScoreBreakdown,
  VerdictType,
  VisitPatternData,
  TicketUpgradeData,
  SegmentChangeData,
  SegmentChangeComparison,
  SegmentMigration,
  SegmentMigrationComparison,
} from '@/types/strategy'

/** 성과 분석 개요 탭에서 사용하는 공통 데이터 타입 (이벤트/운영 변경 공용) */
export interface PerformanceOverviewData {
  id: string
  branchId: string
  branchName: string
  comparisonType: ComparisonType

  // 매출
  revenueBefore: number
  revenueAfter: number
  revenueGrowth: number
  revenueGrowthAdjusted?: number

  // 방문
  visitsBefore: number
  visitsAfter: number
  visitsGrowth: number

  // 고객
  newCustomers: number
  returnedCustomers: number

  // 이용권별 매출 (전후 비교)
  dayTicketRevenue?: number
  dayTicketRevenueBefore?: number
  timeTicketRevenue?: number
  timeTicketRevenueBefore?: number
  termTicketRevenue?: number
  termTicketRevenueBefore?: number
  fixedTicketRevenue?: number
  fixedTicketRevenueBefore?: number

  // 기대 매출 예측
  forecast?: {
    expectedRevenue: number
    baseRevenue: number
    seasonIndex: number
    externalFactorIndex: number
    trendCoefficient: number
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
    breakdown: {
      baseRevenueReason: string
      seasonReason: string
      externalReason: string
      trendReason: string
    }
  }
  useForecast?: boolean
  isNewBranch?: boolean
  noYoyDataReason?: string

  // 통계
  isSignificant?: boolean
  pValue?: number
  effectSize?: number

  // 점수 상세
  scoreBreakdown?: ScoreBreakdown

  // 종합
  performanceScore?: number
  verdict?: VerdictType
  insights?: string[]
}

export interface DataAvailabilityInfo {
  branchId: string
  branchName: string
  hasYoyData: boolean
  oldestDataDate: string
}

/** 방문 패턴 탭 - 공통 퍼포먼스 데이터 */
export interface VisitTabPerformance {
  id: string
  branchName: string
  visitPattern?: VisitPatternData
}

/** 이용권 탭 - 공통 퍼포먼스 데이터 */
export interface TicketTabPerformance {
  id: string
  branchName: string
  ticketUpgrades?: TicketUpgradeData[]
  dayTicketRevenue?: number
  dayTicketRevenueBefore?: number
  timeTicketRevenue?: number
  timeTicketRevenueBefore?: number
  termTicketRevenue?: number
  termTicketRevenueBefore?: number
  fixedTicketRevenue?: number
  fixedTicketRevenueBefore?: number
}

/** 이용권 탭 - 요약 데이터 */
export interface TicketTabSummary {
  ticketUpgrades: TicketUpgradeData[]
}

/** 세그먼트 탭 - 공통 퍼포먼스 데이터 */
export interface SegmentTabPerformance {
  id: string
  branchName: string
  segmentChanges?: SegmentChangeData[] | SegmentChangeComparison[]
  segmentMigrations?: SegmentMigration[] | SegmentMigrationComparison[]
  hasSegmentComparisonData?: boolean
  segmentPeriodInfo?: {
    actualPeriod: { start: string; end: string }
    comparisonPeriod: { start: string; end: string } | null
    comparisonSource: 'YOY' | 'MOM' | 'SEASONAL' | null
    coefficients?: {
      seasonIndex: Record<string, number>
      trendCoeff: Record<string, number>
      dataMonths: number
    }
  }
}
