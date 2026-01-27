import { CustomerSegment } from '@/types/crm'

export type TicketSubType = 'day' | 'time' | 'term' | 'fixed'

interface SegmentInput {
  hasClaim: boolean
  lastVisitDate: Date | null
  firstVisitDate: Date
  recentVisits: number      // 30일 내 방문 수
  favoriteTicketType: TicketSubType | null
}

/**
 * 고객 세그먼트를 우선순위 기반으로 분류
 *
 * 우선순위:
 * 1. 클레임 경험 -> claim
 * 2. 30일+ 미방문 -> churned (이탈)
 * 3. 7~30일 미방문 -> at_risk_7 (이탈위험)
 * 4. 신규 0~7일 -> new_0_7
 * 5. 당일권 유저 -> day_ticket
 * 6. 정기권 유저 (시간권/기간권/고정석) -> term_ticket
 * 7. 30일 내 방문 20회+ -> visit_over20 (VIP)
 * 8. 30일 내 방문 10~20회 -> visit_10_20 (단골)
 * 9. 30일 내 방문 10회 미만 -> visit_under10 (일반)
 */
export function calculateSegment(input: SegmentInput): CustomerSegment {
  const now = new Date()

  // 1. 클레임 경험
  if (input.hasClaim) {
    return 'claim'
  }

  // 2-3. 미방문 기간 기반
  if (input.lastVisitDate) {
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - input.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    // 2. 30일+ 미방문 (이탈)
    if (daysSinceLastVisit >= 30) {
      return 'churned'
    }
    // 3. 7~30일 미방문 (이탈위험)
    if (daysSinceLastVisit >= 7) {
      return 'at_risk_7'
    }
  }

  // 4. 신규 0~7일
  const daysSinceFirstVisit = Math.floor(
    (now.getTime() - input.firstVisitDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceFirstVisit <= 7) {
    return 'new_0_7'
  }

  // 5. 당일권 유저
  if (input.favoriteTicketType === 'day') {
    return 'day_ticket'
  }

  // 6. 정기권 유저 (시간권, 기간권, 고정석 모두 포함)
  if (
    input.favoriteTicketType === 'time' ||
    input.favoriteTicketType === 'term' ||
    input.favoriteTicketType === 'fixed'
  ) {
    return 'term_ticket'
  }

  // 7~9. 방문 빈도 기반 (30일 내 방문 수)
  if (input.recentVisits >= 20) {
    return 'visit_over20'
  }
  if (input.recentVisits >= 10) {
    return 'visit_10_20'
  }
  return 'visit_under10'
}

/**
 * 이용권 이름에서 타입을 추론
 * - 당일권: "당일", "일일", "1day" 등 포함
 * - 고정석: "고정" 포함
 * - 기간권: "기간", "정기", "주", "월" 등 포함
 * - 시간권: 나머지
 */
export function inferTicketType(ticketName: string): TicketSubType {
  const lower = ticketName.toLowerCase()
  if (lower.includes('당일') || lower.includes('일일') || lower.includes('1day') || lower.includes('1일')) {
    return 'day'
  }
  if (lower.includes('고정')) {
    return 'fixed'
  }
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
