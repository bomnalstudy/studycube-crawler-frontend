// CRM 세그먼트 타입
export type CustomerSegment =
  | 'claim'         // 클레임 경험 고객
  | 'at_risk_7'     // 7일 미방문 (이탈위험)
  | 'new_0_7'       // 신규 0~7일
  | 'day_ticket'    // 당일권 유저
  | 'term_ticket'   // 정기권 유저
  | 'visit_over20'  // VIP (30일 내 20회+)
  | 'visit_10_20'   // 단골 (30일 내 10~20회)
  | 'visit_under10' // 일반 (30일 내 10회 미만)

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  claim: '클레임',
  at_risk_7: '이탈위험',
  new_0_7: '신규',
  day_ticket: '당일권',
  term_ticket: '정기권',
  visit_over20: 'VIP',
  visit_10_20: '단골',
  visit_under10: '일반',
}

export const SEGMENT_COLORS: Record<CustomerSegment, string> = {
  claim: '#EF4444',
  at_risk_7: '#F97316',
  new_0_7: '#22C55E',
  day_ticket: '#3B82F6',
  term_ticket: '#8B5CF6',
  visit_over20: '#F59E0B',
  visit_10_20: '#06B6D4',
  visit_under10: '#6B7280',
}

export const SEGMENT_DESCRIPTIONS: Record<CustomerSegment, string> = {
  claim: '클레임 경험이 있는 고객',
  at_risk_7: '마지막 방문 후 7일 이상 경과',
  new_0_7: '첫 방문 후 7일 이내 신규 고객',
  day_ticket: '당일권을 주로 이용하는 고객',
  term_ticket: '정기권(기간권)을 주로 이용하는 고객',
  visit_over20: '30일 내 방문 20회 이상 (VIP)',
  visit_10_20: '30일 내 방문 10~20회 (단골)',
  visit_under10: '30일 내 방문 10회 미만 (일반)',
}

// CRM 대시보드 데이터
export interface CrmDashboardData {
  kpi: {
    totalCustomers: number
    newCustomers: number
    atRiskCustomers: number
    claimCustomers: number
  }
  revisitRatios: {
    generalRevisitRate: number  // 일반고객 재방문 비율
    newRevisitRate: number      // 신규고객 재방문 비율
  }
  operationQueue: {
    atRisk: OperationQueueItem[]
    newSignups: OperationQueueItem[]
    dayTicketRepeaters: OperationQueueItem[]
  }
  segmentLtv: SegmentChartItem[]
  segmentRevisitRate: SegmentChartItem[]
}

export interface OperationQueueItem {
  customerId: string
  phone: string
  lastVisitDate: string | null
  totalVisits: number
  totalSpent: number
  segment: CustomerSegment
}

export interface SegmentChartItem {
  segment: CustomerSegment
  label: string
  value: number
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
  segment: CustomerSegment
  claimCount: number
  recentVisits: number  // 30일 내 방문 수
}

// 고객 리스트 필터
export interface CustomerListFilter {
  segment?: CustomerSegment
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
  segment: CustomerSegment
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
