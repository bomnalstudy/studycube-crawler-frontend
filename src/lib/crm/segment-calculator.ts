import { VisitSegment, TicketSegment } from '@/types/crm'

export type TicketSubType = 'day' | 'time' | 'term' | 'fixed'

interface VisitSegmentInput {
  lastVisitDate: Date | null
  firstVisitDate: Date
  recentVisits: number      // 선택 기간 내 방문 수
  referenceDate?: Date      // 기준 날짜 = rangeEnd (기본: 현재)
  rangeStart?: Date         // 기간 시작일 (신규 판단용)
  previousLastVisitDate?: Date | null  // 기간 시작 이전 마지막 방문일 (복귀 판단용)
  hasRemainingFixedSeat?: boolean      // 잔여 고정석 (입퇴실 없으므로 이탈 판정 제외)
  hasRemainingTermTicket?: boolean     // 잔여 기간권 (정기 이용자이므로 이탈 판정 제외)
}

interface TicketSegmentInput {
  hasRemainingTermTicket: boolean  // 잔여 기간권
  hasRemainingTimePackage: boolean // 잔여 시간패키지
  hasRemainingFixedSeat: boolean   // 잔여 고정석
}

/**
 * 방문 세그먼트 분류
 *
 * 분류 기준:
 * 0. 잔여 고정석/기간권 보유 -> visit_10_20 (단골) — 정기 이용자이므로 이탈 판정 제외
 * 1. 30일+ 미방문 & 기간 내 방문 없음 -> churned (이탈)
 * 2. 14~30일 미방문 -> at_risk_14 (이탈위험)
 * 3. 30일+ 미방문이었으나 기간 내 재방문 -> returned (복귀)
 * 4. 첫 방문일이 선택 기간 내 -> new_0_7 (신규)
 * 5. 30일 내 방문 20회+ -> visit_over20 (VIP)
 * 6. 30일 내 방문 10~20회 -> visit_10_20 (단골)
 * 7. 30일 내 방문 10회 미만 -> visit_under10 (일반)
 */
export function calculateVisitSegment(input: VisitSegmentInput): VisitSegment {
  const refDate = input.referenceDate || new Date()

  // 0. 고정석/기간권 이용자: 정기 이용자이므로 이탈/이탈위험 판정에서 제외
  //    기간 중 이용 중인 것으로 간주하여 단골로 분류
  if (input.hasRemainingFixedSeat || input.hasRemainingTermTicket) {
    return 'visit_10_20'
  }

  // 1-2. 미방문 기간 기반
  if (input.lastVisitDate) {
    const daysSinceLastVisit = Math.floor(
      (refDate.getTime() - input.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastVisit >= 30) {
      return 'churned'
    }
    if (daysSinceLastVisit >= 14) {
      return 'at_risk_14'
    }
  }

  // 3. 복귀: 기간 내 방문이 있지만, 이전 마지막 방문이 30일+ 전
  if (input.previousLastVisitDate && input.rangeStart && input.recentVisits > 0) {
    const daysBetween = Math.floor(
      (input.rangeStart.getTime() - input.previousLastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysBetween >= 30) {
      return 'returned'
    }
  }

  // 4. 신규: 첫 방문일이 선택 기간 내
  if (input.rangeStart) {
    if (input.firstVisitDate >= input.rangeStart && input.firstVisitDate <= refDate) {
      return 'new_0_7'
    }
  } else {
    // rangeStart 없으면 기존 로직 (referenceDate 기준 7일 이내)
    const daysSinceFirstVisit = Math.floor(
      (refDate.getTime() - input.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceFirstVisit <= 7) {
      return 'new_0_7'
    }
  }

  // 5~7. 방문 빈도 기반 (30일 내 방문 수)
  if (input.recentVisits >= 20) {
    return 'visit_over20'
  }
  if (input.recentVisits >= 10) {
    return 'visit_10_20'
  }
  return 'visit_under10'
}

/**
 * 이용권 세그먼트 분류
 *
 * 잔여 이용권 종류별로 세분화 (우선순위: 고정석 > 기간권 > 시간권 > 당일권)
 * - 고정석 보유 -> fixed_ticket
 * - 기간권 보유 -> term_ticket
 * - 시간패키지 보유 -> time_ticket
 * - 미보유 -> day_ticket
 */
export function calculateTicketSegment(input: TicketSegmentInput): TicketSegment {
  if (input.hasRemainingFixedSeat) return 'fixed_ticket'
  if (input.hasRemainingTermTicket) return 'term_ticket'
  if (input.hasRemainingTimePackage) return 'time_ticket'
  return 'day_ticket'
}

/**
 * 이용권 이름에서 타입을 추론
 * - 당일권: "시간" 포함하고 그 앞 숫자가 12 이하 (예: "2시간", "당일권(12시간)")
 * - 고정석: "고정" 포함
 * - 기간권: "기간", "정기", "주", "월" 등 포함
 * - 시간권: 나머지
 */
export function inferTicketType(ticketName: string): TicketSubType {
  const lower = ticketName.toLowerCase()

  // 고정석 먼저 체크
  if (lower.includes('고정')) {
    return 'fixed'
  }

  // 시간패키지 체크 (당일권보다 먼저 — "시간" 포함이지만 패키지 이용자)
  if (lower.includes('시간패키지') || lower.includes('시간 패키지') || lower.includes('패키지')) {
    return 'time'
  }

  // 기간권 체크
  if (
    lower.includes('기간') ||
    lower.includes('정기') ||
    lower.includes('주간') ||
    lower.includes('월간') ||
    lower.includes('4주') ||
    lower.includes('2주')
  ) {
    return 'term'
  }

  // 당일권 체크: "시간" 포함하고 그 앞 숫자가 12 이하
  const hourMatch = ticketName.match(/(\d+)\s*시간/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    if (hours <= 12) {
      return 'day'
    }
  }

  // 기존 당일권 키워드도 유지
  if (lower.includes('당일') || lower.includes('일일') || lower.includes('1day') || lower.includes('1일')) {
    return 'day'
  }

  return 'time'
}

/**
 * 고객의 가장 많이 사용한 이용권 타입 계산
 */
export function calculateFavoriteTicketType(
  purchases: { ticketName: string; amount: number }[]
): TicketSubType | null {
  if (purchases.length === 0) return null

  const typeCount: Record<string, number> = { day: 0, time: 0, term: 0, fixed: 0 }
  for (const p of purchases) {
    if (p.amount <= 0) continue
    const type = inferTicketType(p.ticketName)
    typeCount[type]++
  }

  const entries = Object.entries(typeCount).sort((a, b) => b[1] - a[1])
  if (entries[0][1] === 0) return null
  return entries[0][0] as TicketSubType
}
