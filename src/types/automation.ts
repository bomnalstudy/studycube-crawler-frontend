// ===== 플로우 타입 =====

export type FlowType = 'SMS' | 'POINT' | 'SMS_POINT'

export const FLOW_TYPE_LABELS: Record<FlowType, string> = {
  SMS: '문자',
  POINT: '포인트',
  SMS_POINT: '문자 + 포인트',
}

export const FLOW_TYPE_COLORS: Record<FlowType, string> = {
  SMS: '#2563EB',
  POINT: '#7C3AED',
  SMS_POINT: '#0891B2',
}

// ===== 트리거 설정 =====

export type TriggerType = 'scheduled' | 'recurring' | 'manual'

export interface TriggerConfig {
  type: TriggerType
  /** 실행 시각 (HH:mm), 오전 9시~오후 9시 */
  time?: string
  /** 예약 실행 날짜 (YYYY-MM-DD) */
  scheduledDate?: string
  /** 반복 주기 */
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    /** weekly: 0(일)~6(토), monthly: 1~31 */
    daysOfWeek?: number[]
    dayOfMonth?: number
    /** 직접 입력 간격 (N일마다) */
    customIntervalDays?: number
    /** 반복 종료 날짜 (YYYY-MM-DD) - 이 날짜 이후 자동 비활성화 */
    endDate?: string
  }
}

// ===== 필터 설정 =====

export interface DateCondition {
  /** 첫 방문 후 +N일 */
  daysAfterFirstVisit?: number
  /** 마지막 방문 후 +N일 */
  daysAfterLastVisit?: number
  /** 이번달 방문 횟수 (최소) */
  minMonthlyVisits?: number
  /** 이번달 방문 횟수 (최대) */
  maxMonthlyVisits?: number
}

export interface FilterConfig {
  // ===== 대상 선택 모드 =====
  /** 'condition' = 조건 기반, 'manual' = 직접 입력 */
  targetMode?: 'condition' | 'manual'
  /** 직접 입력한 전화번호 목록 */
  manualPhones?: string[]
  // 세그먼트 기반 (선택)
  visitSegments?: string[]
  ticketSegments?: string[]
  // 연령/성별 (선택)
  ageGroups?: string[]
  genders?: string[]
  // 방문 횟수 기반 (선택)
  minVisits?: number
  maxVisits?: number
  // 소비 금액 기반 (선택)
  minSpent?: number
  maxSpent?: number
  // 세그먼트 기간 (선택)
  minSegmentDays?: number
  maxSegmentDays?: number
  /** 미방문 N일 이상 */
  inactiveDays?: number
  /** 날짜 기반 조건 */
  dateCondition?: DateCondition
  // ===== 중복 발송 방지 설정 =====
  /** 동일 고객에게 최대 발송 횟수 (null = 무제한) */
  maxSendsPerCustomer?: number | null
  /** 동일 고객에게 재발송 대기 기간 (일), null이면 미적용 */
  sendCooldownDays?: number | null
}

// ===== 포인트 설정 =====

export type PointAction = 'GRANT' | 'DEDUCT'

export interface PointConfig {
  action: PointAction
  amount: number
  reason: string
  /** 유효기간 (일), 기본 30일 */
  expiryDays: number
  /** 중복 지급 방지 기간 (일), null이면 미적용 */
  deduplicateDays: number | null
}

// ===== 메시지 설정 =====

export type MessageType = 'SMS' | 'LMS'

// ===== 플로우 데이터 =====

export interface AutomationFlow {
  id: string
  name: string
  flowType: FlowType
  branchId: string
  isActive: boolean
  triggerConfig: TriggerConfig
  filterConfig: FilterConfig
  messageTemplate: string | null
  messageType: MessageType | null
  pointConfig: PointConfig | null
  createdBy: string
  createdAt: string
  updatedAt: string
  lastExecutedAt: string | null
  // 스터디큐브 로그인 정보 (자동 문자 발송용)
  studycubeUsername: string | null
  studycubePassword: string | null
  // 조회 시 추가 정보
  branch?: { id: string; name: string }
  author?: { id: string; name: string }
  _count?: { sendLogs: number; pointLogs: number }
}

export interface AutomationFlowCreateInput {
  name: string
  flowType: FlowType
  branchId: string
  isActive?: boolean
  triggerConfig: TriggerConfig
  filterConfig: FilterConfig
  messageTemplate?: string | null
  messageType?: MessageType | null
  pointConfig?: PointConfig | null
  studycubeUsername?: string | null
  studycubePassword?: string | null
}

// ===== 발송/실행 로그 =====

export type LogStatus = 'SUCCESS' | 'FAILED'

export interface SmsSendLog {
  id: string
  flowId: string
  customerId: string
  phone: string
  message: string
  byteCount: number
  pointUsed: number
  sentAt: string
  status: LogStatus
}

export interface PointActionLog {
  id: string
  flowId: string
  customerId: string
  phone: string
  action: PointAction
  amount: number
  reason: string
  expiryDate: string | null
  executedAt: string
  status: LogStatus
}

// ===== 대시보드 요약 =====

export interface AutomationSummary {
  totalFlows: number
  activeFlows: number
  smsFlows: number
  pointFlows: number
  thisMonthSmsSent: number
  thisMonthSmsPoints: number
  thisMonthPointGranted: number
  thisMonthPointDeducted: number
}
