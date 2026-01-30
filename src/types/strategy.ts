// ===== 이벤트 유형 (기간 한정) =====

export const EVENT_MAIN_TYPES = {
  PRICING: '가격 정책',
  PROMOTION: '프로모션',
  MARKETING: '마케팅',
  ENGAGEMENT: '고객 참여',
} as const

export const EVENT_SUB_TYPES = {
  // PRICING
  DISCOUNT_GENERAL: '전체 할인',
  DISCOUNT_TICKET: '특정 이용권 할인',
  DISCOUNT_SEGMENT: '특정 고객 대상 할인',
  PRICE_CHANGE: '가격 인상/인하',
  BUNDLE: '묶음 상품',
  // PROMOTION
  POINT_EVENT: '포인트 적립 이벤트',
  REFERRAL: '친구 추천',
  REVIEW_EVENT: '리뷰 이벤트',
  FIRST_VISIT: '첫 방문 혜택',
  COMEBACK: '복귀 고객 프로모션',
  // MARKETING
  SMS_CAMPAIGN: '문자 캠페인',
  SOCIAL_MEDIA: 'SNS 광고',
  OFFLINE_AD: '오프라인 광고',
  PARTNERSHIP: '제휴 마케팅',
  // ENGAGEMENT
  SEASONAL_EVENT: '시즌 이벤트',
  GIVEAWAY: '굿즈/경품 증정',
  PHOTO_EVENT: '포토존/인증샷 이벤트',
  COMMUNITY: '커뮤니티 활동',
} as const

export const SUB_TYPE_BY_MAIN: Record<EventMainType, EventSubType[]> = {
  PRICING: ['DISCOUNT_GENERAL', 'DISCOUNT_TICKET', 'DISCOUNT_SEGMENT', 'PRICE_CHANGE', 'BUNDLE'],
  PROMOTION: ['POINT_EVENT', 'REFERRAL', 'REVIEW_EVENT', 'FIRST_VISIT', 'COMEBACK'],
  MARKETING: ['SMS_CAMPAIGN', 'SOCIAL_MEDIA', 'OFFLINE_AD', 'PARTNERSHIP'],
  ENGAGEMENT: ['SEASONAL_EVENT', 'GIVEAWAY', 'PHOTO_EVENT', 'COMMUNITY'],
}

export type EventMainType = keyof typeof EVENT_MAIN_TYPES
export type EventSubType = keyof typeof EVENT_SUB_TYPES

// ===== 운영 변경 유형 (영구적) =====

export const OPERATION_SUB_TYPES = {
  NEW_SERVICE: '신규 서비스 도입',
  FACILITY_UPGRADE: '시설 개선',
  SEAT_CHANGE: '좌석 구성 변경',
} as const

export type OperationSubType = keyof typeof OPERATION_SUB_TYPES

export const OPERATION_STATUS = {
  PLANNED: '예정',
  IMPLEMENTED: '적용됨',
  CANCELLED: '취소',
} as const

export type OperationStatus = keyof typeof OPERATION_STATUS

// ===== 외부 요인 유형 =====

export const EXTERNAL_FACTOR_TYPES = {
  EXAM: '시험 기간',
  VACATION: '방학',
  HOLIDAY: '공휴일',
  WEATHER: '날씨/재해',
  COMPETITOR: '경쟁업체 동향',
} as const

export type ExternalFactorType = keyof typeof EXTERNAL_FACTOR_TYPES

export const IMPACT_ESTIMATES = {
  POSITIVE_HIGH: '긍정적 (높음)',
  POSITIVE_MEDIUM: '긍정적 (중간)',
  POSITIVE_LOW: '긍정적 (낮음)',
  NEUTRAL: '중립',
  NEGATIVE_LOW: '부정적 (낮음)',
  NEGATIVE_MEDIUM: '부정적 (중간)',
  NEGATIVE_HIGH: '부정적 (높음)',
} as const

export type ImpactEstimate = keyof typeof IMPACT_ESTIMATES

// ===== 이벤트 상태 =====

export const EVENT_STATUS = {
  PLANNED: '예정',
  ONGOING: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
} as const

export type EventStatus = keyof typeof EVENT_STATUS

// ===== 지점 특성 =====

export const BRANCH_REGIONS = {
  CAPITAL: '수도권',
  GYEONGGI: '경기',
  PROVINCE: '지방',
} as const

export const BRANCH_SIZES = {
  SMALL: '소형',
  MEDIUM: '중형',
  LARGE: '대형',
} as const

export const BRANCH_TARGET_AUDIENCES = {
  STUDENT: '학생가',
  RESIDENTIAL: '주거지',
  OFFICE: '오피스',
} as const

export type BranchRegion = keyof typeof BRANCH_REGIONS
export type BranchSize = keyof typeof BRANCH_SIZES
export type BranchTargetAudience = keyof typeof BRANCH_TARGET_AUDIENCES

// ===== 비교 유형 =====

export const COMPARISON_TYPES = {
  YOY: '전년 동기 대비',
  MOM: '전월 동일 요일 대비',
  CONTROL: '대조군 비교',
} as const

export type ComparisonType = keyof typeof COMPARISON_TYPES

// ===== 성과 평가 =====

export const VERDICT_TYPES = {
  EXCELLENT: '매우 좋음',
  GOOD: '좋음',
  NEUTRAL: '보통',
  POOR: '미흡',
  FAILED: '실패',
} as const

export type VerdictType = keyof typeof VERDICT_TYPES

// ===== 세그먼트 유형 =====

export const SEGMENT_TYPES = {
  VISIT: '방문 세그먼트',
  TICKET: '이용권 세그먼트',
  AGE: '연령대',
  GENDER: '성별',
} as const

export type SegmentType = keyof typeof SEGMENT_TYPES

// ===== API 요청/응답 타입 =====

export interface EventTypeInput {
  type: EventMainType
  subType: EventSubType
}

export interface EventTargetInput {
  segmentType: SegmentType
  segmentValue: string
}

export interface CreateEventInput {
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string
  types: EventTypeInput[]
  branchIds: string[]
  targets?: EventTargetInput[]
  cost?: number
  description?: string
  hypothesis?: string
  primaryKpi?: string
  secondaryKpis?: string[]
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus
}

export interface EventListItem {
  id: string
  name: string
  startDate: string
  endDate: string
  status: EventStatus
  types: {
    type: EventMainType
    subType: EventSubType
  }[]
  branches: {
    id: string
    name: string
  }[]
  createdAt: string
}

export interface EventDetail extends EventListItem {
  cost?: number
  description?: string
  hypothesis?: string
  primaryKpi?: string
  secondaryKpis?: string[]
  targets: {
    segmentType: SegmentType
    segmentValue: string
  }[]
  createdBy: {
    id: string
    name: string
  }
}

// ===== 외부 요인 타입 =====

export interface RecurringRule {
  type: 'YEARLY' | 'MONTHLY'
  month?: number // 1-12
  weekOfMonth?: number // 1-5
  dayOfWeek?: number // 0-6 (일-토)
  dayOfMonth?: number // 1-31
}

export interface CreateExternalFactorInput {
  type: ExternalFactorType
  name: string
  startDate: string
  endDate: string
  branchIds: string[]
  impactEstimate?: ImpactEstimate
  description?: string
  isRecurring?: boolean
  recurringRule?: RecurringRule
}

export interface ExternalFactorListItem {
  id: string
  type: ExternalFactorType
  name: string
  startDate: string
  endDate: string
  impactEstimate?: ImpactEstimate
  isRecurring: boolean
  branches: {
    id: string
    name: string
  }[]
}

// ===== 성과 분석 타입 =====

export interface SegmentTransition {
  from: string
  to: string
  count: number
  avgLtvChange?: number
}

// 점수 계산 상세 내역
export interface ScoreBreakdown {
  baseScore: number
  revenueGrowthScore: number
  revenueGrowthReason: string
  visitsGrowthScore: number
  visitsGrowthReason: string
  statisticalScore: number
  statisticalReason: string
  customerScore: number
  customerReason: string
  segmentScore: number
  segmentReason: string
  ticketUpgradeScore: number
  ticketUpgradeReason: string
  totalScore: number
}

export interface EventPerformanceData {
  id: string
  eventId: string
  branchId: string
  branchName: string
  calculatedAt: string
  comparisonType: ComparisonType

  // 매출
  revenueBefore: number
  revenueAfter: number
  revenueGrowth: number
  revenueGrowthAdjusted?: number

  // 고객
  newCustomers: number
  returnedCustomers: number
  churnedCustomers: number
  segmentTransitions?: SegmentTransition[]

  // 방문
  visitsBefore: number
  visitsAfter: number
  visitsGrowth: number

  // 이용권별 (전후 비교)
  dayTicketRevenue?: number
  dayTicketRevenueBefore?: number
  timeTicketRevenue?: number
  timeTicketRevenueBefore?: number
  termTicketRevenue?: number
  termTicketRevenueBefore?: number
  fixedTicketRevenue?: number
  fixedTicketRevenueBefore?: number

  // 세그먼트 변화
  segmentChanges?: SegmentChangeData[]
  segmentMigrations?: SegmentMigration[]

  // 이용권 업그레이드
  ticketUpgrades?: TicketUpgradeData[]

  // 방문 패턴
  visitPattern?: VisitPatternData

  // 전년 데이터 없음 여부 (신규 오픈 지점)
  isNewBranch?: boolean
  noYoyDataReason?: string

  // 기대 매출 예측 (비교 데이터 없을 때 사용)
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
  useForecast?: boolean // 예측 기반 분석 여부

  // 통계
  isSignificant?: boolean
  pValue?: number
  effectSize?: number

  // 점수 계산 상세
  scoreBreakdown?: ScoreBreakdown

  // 종합
  performanceScore?: number
  verdict?: VerdictType
  insights?: string[]
}

export interface AnalysisRequest {
  eventId: string
  branchIds?: string[]
  comparisonType?: ComparisonType
}

export interface AnalysisResponse {
  event: EventDetail
  performances: EventPerformanceData[]
  externalFactors: ExternalFactorListItem[] // 해당 기간 겹치는 외부 요인
  dataAvailability: {
    branchId: string
    branchName: string
    hasYoyData: boolean // 전년 동기 데이터 있음
    oldestDataDate: string
  }[]
}

// ===== 코호트 타입 (Phase 2) =====

export type CohortType = 'NEW' | 'RETURNED' | 'PARTICIPATED'

export interface CohortSnapshot {
  snapshotMonth: 1 | 3 | 6
  activeCount: number
  revisitRate: number
  avgLtv: number
  upgradedCount: number
  churnedCount: number
  calculatedAt: string
}

export interface EventCohortData {
  id: string
  eventId: string
  cohortType: CohortType
  customerCount: number
  snapshots: CohortSnapshot[]
  controlGroup?: {
    revisitRate: number
    avgLtv: number
  }
}

// ===== 지점 특성 타입 =====

export interface BranchCharacteristics {
  region?: BranchRegion
  size?: BranchSize
  targetAudience?: BranchTargetAudience
  openedAt?: string
  maturity?: 'NEW' | 'STABLE' | 'MATURE' // 계산됨
}

export interface BranchWithCharacteristics {
  id: string
  name: string
  characteristics: BranchCharacteristics
}

export interface UpdateBranchCharacteristicsInput {
  region?: BranchRegion
  size?: BranchSize
  targetAudience?: BranchTargetAudience
  openedAt?: string
}

// ===== 대시보드 타입 =====

export interface StrategyDashboardData {
  ongoingEvents: EventListItem[]
  recentCompletedEvents: {
    event: EventListItem
    avgPerformanceScore?: number
    verdict?: VerdictType
  }[]
  upcomingCohortSnapshots: {
    eventId: string
    eventName: string
    cohortType: CohortType
    snapshotMonth: 1 | 3 | 6
    dueDate: string
  }[]
  externalFactorsThisMonth: ExternalFactorListItem[]
  recentOperations: OperationListItem[]
}

// ===== 운영 변경 타입 =====

export interface CreateOperationInput {
  name: string
  subType: OperationSubType
  implementedAt: string // 적용일
  branchIds: string[]
  cost?: number
  description?: string
  expectedEffect?: string // 예상 효과
}

export interface UpdateOperationInput extends Partial<CreateOperationInput> {
  status?: OperationStatus
}

export interface OperationListItem {
  id: string
  name: string
  subType: OperationSubType
  implementedAt: string
  status: OperationStatus
  branches: {
    id: string
    name: string
  }[]
  createdAt: string
}

export interface OperationDetail extends OperationListItem {
  cost?: number
  description?: string
  expectedEffect?: string
  createdBy: {
    id: string
    name: string
  }
}

// ===== 운영 변경 성과 분석 =====

// 세그먼트 변화 데이터
export interface SegmentChangeData {
  segmentName: string // VIP, 단골, 일반, 신규, 이탈위험, 이탈, 복귀
  countBefore: number
  countAfter: number
  change: number
  changePercent: number
  isNegativeSegment: boolean // 감소가 긍정적인 세그먼트인지 (이탈위험, 이탈)
}

// 세그먼트 이동 데이터 (A→B)
export interface SegmentMigration {
  fromSegment: string
  toSegment: string
  count: number
  isPositive: boolean // 긍정적인 이동인지 (이탈위험→단골 등)
}

// 이용권 변화 데이터
export interface TicketTypeChangeData {
  ticketType: string // 당일권, 시간권, 기간권, 고정석
  revenueBefore: number
  revenueAfter: number
  revenueChange: number
  revenueChangePercent: number
  buyersBefore: number
  buyersAfter: number
  buyersChange: number
}

// 이용권 업그레이드 데이터
export interface TicketUpgradeData {
  fromTicket: string // 당일권
  toTicket: string // 시간권, 기간권 등
  count: number
  upgradeRate: number // 전체 당일권 이용자 중 업그레이드 비율
}

// 방문 패턴 데이터
export interface VisitPatternData {
  avgVisitsPerCustomerBefore: number
  avgVisitsPerCustomerAfter: number
  visitFrequencyChange: number
  avgUsageTimeBefore: number // 평균 이용 시간 (분)
  avgUsageTimeAfter: number
  usageTimeChange: number
  peakHourBefore: number // 0-23
  peakHourAfter: number
}

export interface OperationPerformanceData {
  id: string
  operationId: string
  branchId: string
  branchName: string
  calculatedAt: string
  comparisonType: ComparisonType

  // 적용 전후 비교 (3개월 단위)
  revenueBefore3m: number
  revenueAfter3m: number
  revenueGrowth3m: number

  revenueBefore6m?: number
  revenueAfter6m?: number
  revenueGrowth6m?: number

  // 고객 수 변화
  avgCustomersBefore: number
  avgCustomersAfter: number
  customerGrowth: number

  // 세그먼트 변화
  segmentChanges?: SegmentChangeData[]
  segmentMigrations?: SegmentMigration[]

  // 이용권 변화
  ticketTypeChanges?: TicketTypeChangeData[]
  ticketUpgrades?: TicketUpgradeData[]

  // 방문 패턴 변화
  visitPattern?: VisitPatternData

  // 신규/복귀 고객
  newCustomers?: number
  returnedCustomers?: number // 휴면→활성화

  // 통계
  isSignificant?: boolean
  pValue?: number
  effectSize?: number

  // 종합
  performanceScore?: number
  verdict?: VerdictType
  insights?: string[]
}
