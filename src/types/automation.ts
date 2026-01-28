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
  /** 반복 주기 */
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    /** weekly: 0(일)~6(토), monthly: 1~31 */
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
}

// ===== 필터 설정 =====

export interface FilterConfig {
  visitSegments?: string[]
  ticketSegments?: string[]
  ageGroups?: string[]
  genders?: string[]
  minVisits?: number
  maxVisits?: number
  minSpent?: number
  maxSpent?: number
  minSegmentDays?: number
  maxSegmentDays?: number
  /** 미방문 N일 이상 */
  inactiveDays?: number
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
