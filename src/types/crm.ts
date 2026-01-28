// CRM 방문 세그먼트 타입
export type VisitSegment =
  | 'churned'       // 이탈 (30일+ 미방문)
  | 'at_risk_14'    // 이탈위험 (14~30일 미방문)
  | 'returned'      // 복귀 (30일+ 미방문 후 기간 내 재방문)
  | 'new_0_7'       // 신규 (선택 기간 내 첫 방문)
  | 'visit_under10' // 일반 (30일 내 10회 미만)
  | 'visit_10_20'   // 단골 (30일 내 10~20회)
  | 'visit_over20'  // VIP (30일 내 20회+)

export const VISIT_SEGMENT_LABELS: Record<VisitSegment, string> = {
  churned: '이탈',
  at_risk_14: '이탈위험',
  returned: '복귀',
  new_0_7: '신규',
  visit_under10: '일반',
  visit_10_20: '단골',
  visit_over20: 'VIP',
}

export const VISIT_SEGMENT_COLORS: Record<VisitSegment, string> = {
  churned: '#991B1B',
  at_risk_14: '#F97316',
  returned: '#8B5CF6',
  new_0_7: '#22C55E',
  visit_under10: '#6B7280',
  visit_10_20: '#06B6D4',
  visit_over20: '#F59E0B',
}

export const VISIT_SEGMENT_DESCRIPTIONS: Record<VisitSegment, string> = {
  churned: '마지막 방문 후 30일 이상 경과',
  at_risk_14: '마지막 방문 후 14~30일 경과',
  returned: '30일+ 미방문 후 기간 내 재방문',
  new_0_7: '선택 기간 내 첫 방문 고객',
  visit_under10: '30일 내 방문 10회 미만',
  visit_10_20: '30일 내 방문 10~20회',
  visit_over20: '30일 내 방문 20회 이상',
}

// CRM 이용권 세그먼트 타입
export type TicketSegment =
  | 'day_ticket'    // 당일권 (잔여 정기권 없음)
  | 'time_ticket'   // 시간권 (잔여 시간패키지 보유)
  | 'term_ticket'   // 기간권 (잔여 기간권 보유)
  | 'fixed_ticket'  // 고정석 (잔여 고정석 보유)

export const TICKET_SEGMENT_LABELS: Record<TicketSegment, string> = {
  day_ticket: '당일권',
  time_ticket: '시간권',
  term_ticket: '기간권',
  fixed_ticket: '고정석',
}

export const TICKET_SEGMENT_COLORS: Record<TicketSegment, string> = {
  day_ticket: '#3B82F6',
  time_ticket: '#06B6D4',
  term_ticket: '#8B5CF6',
  fixed_ticket: '#10B981',
}

export const TICKET_SEGMENT_DESCRIPTIONS: Record<TicketSegment, string> = {
  day_ticket: '잔여 정기권이 없는 고객',
  time_ticket: '잔여 시간패키지를 보유한 고객',
  term_ticket: '잔여 기간권을 보유한 고객',
  fixed_ticket: '잔여 고정석을 보유한 고객',
}

// CRM 대시보드 데이터
export interface CrmDashboardData {
  kpi: {
    totalCustomers: number
    newCustomers: number
    atRiskCustomers: number
    churnedCustomers: number
    timeTicketCustomers: number
    termTicketCustomers: number
    fixedTicketCustomers: number
  }
  revisitRatios: {
    generalRevisitRate: number  // 일반고객 재방문 비율
    newRevisitRate: number      // 신규고객 재방문 비율
  }
  operationQueue: {
    atRisk: OperationQueueItem[]
    returned: OperationQueueItem[]
    newSignups: OperationQueueItem[]
    dayTicketRepeaters: OperationQueueItem[]
  }
  visitSegmentCounts: SegmentChartItem[]
  visitSegmentLtv: SegmentChartItem[]
  visitSegmentRevisitRate: SegmentChartItem[]
  ticketSegmentCounts: SegmentChartItem[]
  ticketSegmentLtv: SegmentChartItem[]
  ticketSegmentRevisitRate: SegmentChartItem[]
}

export interface OperationQueueItem {
  customerId: string
  phone: string
  lastVisitDate: string | null
  totalVisits: number
  totalSpent: number
  visitSegment: VisitSegment
  ticketSegment: TicketSegment
}

export interface SegmentChartItem {
  segment: VisitSegment | TicketSegment
  label: string
  value: number
}

// 이용권 세부 타입
export type TicketSubType = 'day' | 'time' | 'term' | 'fixed'

export const TICKET_SUB_TYPE_LABELS: Record<TicketSubType, string> = {
  day: '당일권',
  time: '시간권',
  term: '기간권',
  fixed: '고정석',
}

// 잔여 정기권 정보
export interface RemainingTicketInfo {
  termTicket: string | null    // 잔여 기간권
  timePackage: string | null   // 잔여 시간패키지
  fixedSeat: string | null     // 잔여 고정석
}

// 고객 리스트 아이템
export interface CustomerListItem {
  id: string
  phone: string
  gender: string | null
  ageGroup: string | null
  firstVisitDate: string
  lastVisitDate: string | null
  totalVisits: number
  totalSpent: number
  visitSegment: VisitSegment
  ticketSegment: TicketSegment
  claimCount: number
  recentVisits: number  // 30일 내 방문 수
  favoriteTicketType: TicketSubType | null
  remainingTickets: RemainingTicketInfo | null
}

// 고객 리스트 필터
export interface CustomerListFilter {
  visitSegment?: VisitSegment
  ticketSegment?: TicketSegment
  ageGroup?: string
  gender?: string
  minVisits?: number
  maxVisits?: number
  minSpent?: number
  maxSpent?: number
  hasClaim?: boolean
  search?: string        // 전화번호 검색
  sortBy?: 'totalVisits' | 'totalSpent' | 'lastVisitDate' | 'recentVisits'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  // 커스텀 날짜 범위 (방문수 계산 기준)
  visitStartDate?: string
  visitEndDate?: string
}

// 고객 상세 정보
export interface CustomerDetail {
  id: string
  phone: string
  gender: string | null
  age: number | null
  ageGroup: string | null
  birthdate: string | null
  firstVisitDate: string
  lastVisitDate: string | null
  lastPurchaseDate: string | null
  totalVisits: number
  totalSpent: number
  visitSegment: VisitSegment
  ticketSegment: TicketSegment
  recentVisits: number
  stats: CustomerStats
  purchases: CustomerPurchaseItem[]
  visits: CustomerVisitItem[]
  memos: CustomerMemoItem[]
  claims: CustomerClaimItem[]
}

export interface CustomerStats {
  avgDuration: number | null       // 평균 이용시간(분)
  peakHour: number | null          // 주이용시간대
  visitCycleDays: number | null    // 방문주기(일)
  monthlyAvgSpent: number          // 월평균 소비액
  purchaseCycleDays: number | null // 구매주기(일)
  favoriteTicket: string | null    // 선호 이용권
  favoriteSeat: string | null      // 선호 좌석
}

export interface CustomerPurchaseItem {
  id: string
  purchaseDate: string
  ticketName: string
  amount: number
  pointUsed: number | null
  branchName: string
}

export interface CustomerVisitItem {
  id: string
  visitDate: string
  visitTime: string | null
  duration: number | null
  seat: string | null
  branchName: string
}

export interface CustomerMemoItem {
  id: string
  content: string
  createdBy: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface CustomerClaimItem {
  id: string
  title: string
  description: string | null
  status: 'OPEN' | 'RESOLVED' | 'CLOSED'
  branchName: string
  createdBy: string
  authorName: string
  resolvedAt: string | null
  createdAt: string
}

// 페이지네이션 응답
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
