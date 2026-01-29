import { NextRequest, NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { getAuthSession, getBranchFilter } from '@/lib/auth-helpers'
import { ChatRequest, ChatResponse } from '@/types/ai-chat'
import { prisma } from '@/lib/prisma'
import { decimalToNumber } from '@/lib/utils/formatters'
import { kstStartOfDay, kstEndOfDay, getKSTYesterdayStr, getKSTDaysAgoStr } from '@/lib/utils/kst-date'
import { calculateVisitSegment, calculateTicketSegment } from '@/lib/crm/segment-calculator'
import { VisitSegment, TicketSegment, VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS } from '@/types/crm'

export const dynamic = 'force-dynamic'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `# 봄날의서재 스터디카페 - AI 슈퍼바이저

## 역할 정의
당신은 **봄날의서재 스터디카페**의 전문 슈퍼바이저 AI입니다. 점주님의 데이터 기반 의사결정을 돕고, 매장 운영 최적화와 매출 성장을 위한 실질적인 인사이트를 제공합니다.

## 핵심 역량
1. **매출 분석 전문가**: 일별/주별/월별 매출 트렌드, 이용권 유형별 매출 구조, 매출 상승/하락 원인 진단
2. **고객 행동 분석가**: 고객 세그먼트별 이용 패턴, 신규 고객 유입, LTV 및 재방문율 분석
3. **CRM 전략가**: 이탈 위험 고객 식별, 휴면 고객 재활성화, 충성 고객 리텐션, 타겟 마케팅 제안

## 고객 세그먼트 분류

### 방문 세그먼트
| 세그먼트 | 조건 |
|----------|------|
| 이탈 (churned) | 마지막 방문 후 30일+ 경과 |
| 이탈위험 (at_risk_14) | 마지막 방문 후 14~29일 경과 |
| 복귀 (returned) | 30일+ 미방문 후 재방문 |
| 신규 (new_0_7) | 첫 방문이 선택 기간 내 |
| VIP (visit_over20) | 30일 내 20회+ 방문 |
| 단골 (visit_10_20) | 30일 내 10~19회 방문 |
| 일반 (visit_under10) | 30일 내 10회 미만 방문 |

⚠️ 고정석/기간권 보유자는 입퇴실 없어도 이탈 판정 제외 → 단골로 분류

### 이용권 세그먼트
| 세그먼트 | 조건 |
|----------|------|
| 고정석 (fixed_ticket) | 잔여 고정석 보유 |
| 기간권 (term_ticket) | 잔여 기간권 보유 |
| 시간권 (time_ticket) | 잔여 시간패키지 보유 |
| 당일권 (day_ticket) | 잔여 이용권 없음 |

## 응답 원칙
1. **데이터 기반**: 추측이 아닌 실제 데이터에 근거, 수치와 비율 명확히 제시
2. **실행 가능한 제안**: 구체적 액션 플랜, 예상 효과와 우선순위 표시
3. **맥락 이해**: 스터디카페 업종 특성 (시험 시즌, 방학, 학사일정) 반영
4. **점주 친화적**: 전문 용어는 쉽게 설명, 핵심 인사이트 먼저 제시
5. **최소 질문**: 질문은 꼭 필요한 경우에만, 최대 1~2개. 3개 이상 질문 금지. "이번 달"은 현재 월 기준으로 바로 분석
6. **간결하게**: 불필요한 서론 없이 핵심부터 말하기. 이모지 사용 금지

## 주요 질문별 체크리스트

### "매출이 떨어졌어요"
1. 이용자 수 감소 vs 객단가 하락 구분
2. 특정 이용권 매출 급감 여부
3. 특정 고객층 이탈 여부
4. 시간대별 이용 패턴 변화
5. 외부 요인 (시험 종료, 방학 등)

### "단골이 안 와요"
1. 충성 고객 방문 빈도 변화
2. 기간권 만료 후 미갱신 고객
3. 마지막 방문 후 14일+ 경과 고객
4. 포인트/잔여 이용권 보유 현황

## 제안 템플릿
**단기 액션**: [문제] → [원인] → [액션] → [기대효과]
**마케팅 제안**: [타겟] → [오퍼] → [채널] → [기간] → [성과측정]

## 주의사항
- 개인정보 보호: 개별 고객 전화번호 등 식별 정보 노출 금지
- 과도한 낙관/비관 지양
- 데이터로 확인 불가한 외부 요인은 가능성으로만 언급
- 스터디카페는 시험/학사일정에 민감 - 전년 동기 비교가 유의미

## 시작 인사
안녕하세요, 봄날의서재 AI 슈퍼바이저입니다. 매장 데이터를 기반으로 매출 분석, 고객 관리, 운영 개선에 대해 도움드릴 수 있어요.
`

// 실제 데이터 조회 함수
async function fetchAnalyticsData(session: Session, branchId?: string) {
  const requestedBranchId = branchId || 'all'
  const branchFilter = getBranchFilter(session, requestedBranchId)

  // 기간 설정: 이번 달
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const thisMonthStart = kstStartOfDay(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
  const yesterdayStr = getKSTYesterdayStr()
  const thisMonthEnd = kstEndOfDay(yesterdayStr)

  // 지난 달
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const lastMonth = currentMonth === 0 ? 12 : currentMonth
  const lastMonthStart = kstStartOfDay(`${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`)
  const lastMonthEnd = kstEndOfDay(`${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${new Date(lastMonthYear, lastMonth, 0).getDate()}`)

  // 30일 전 기준
  const thirtyDaysAgo = kstStartOfDay(getKSTDaysAgoStr(30))

  const [
    branches,
    thisMonthMetrics,
    lastMonthMetrics,
    allCustomers,
    recentVisitors,
    thisMonthPurchases,
    lastMonthPurchases,
  ] = await Promise.all([
    // 지점 목록
    prisma.branch.findMany({ select: { id: true, name: true } }),
    // 이번 달 매출
    prisma.dailyMetric.findMany({
      where: { ...branchFilter, date: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: { totalRevenue: true, dayTicketRevenue: true, timeTicketRevenue: true, termTicketRevenue: true, lockerRevenue: true, newUsers: true },
    }),
    // 지난 달 매출
    prisma.dailyMetric.findMany({
      where: { ...branchFilter, date: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { totalRevenue: true, dayTicketRevenue: true, timeTicketRevenue: true, termTicketRevenue: true, lockerRevenue: true, newUsers: true },
    }),
    // 전체 고객
    prisma.customer.findMany({
      where: branchFilter.branchId ? { mainBranchId: branchFilter.branchId } : {},
      select: { id: true, phone: true, firstVisitDate: true, lastVisitDate: true, totalVisits: true, totalSpent: true },
    }),
    // 최근 30일 방문자
    prisma.dailyVisitor.findMany({
      where: { ...branchFilter, visitDate: { gte: thirtyDaysAgo, lte: thisMonthEnd } },
      select: { phone: true, customerId: true, visitDate: true, remainingTermTicket: true, remainingTimePackage: true, remainingFixedSeat: true },
    }),
    // 이번 달 구매
    prisma.customerPurchase.findMany({
      where: { ...branchFilter, purchaseDate: { gte: thisMonthStart, lte: thisMonthEnd } },
      select: { customerId: true, ticketName: true, amount: true },
    }),
    // 지난 달 구매
    prisma.customerPurchase.findMany({
      where: { ...branchFilter, purchaseDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { customerId: true, ticketName: true, amount: true },
    }),
  ])

  // 지점명
  const branchName = branchFilter.branchId
    ? branches.find(b => b.id === branchFilter.branchId)?.name || '알 수 없음'
    : '전체 지점'

  // 매출 집계
  const sumMetrics = (metrics: typeof thisMonthMetrics) => ({
    total: metrics.reduce((sum, m) => sum + decimalToNumber(m.totalRevenue), 0),
    day: metrics.reduce((sum, m) => sum + decimalToNumber(m.dayTicketRevenue), 0),
    time: metrics.reduce((sum, m) => sum + decimalToNumber(m.timeTicketRevenue), 0),
    term: metrics.reduce((sum, m) => sum + decimalToNumber(m.termTicketRevenue), 0),
    locker: metrics.reduce((sum, m) => sum + decimalToNumber(m.lockerRevenue), 0),
    newUsers: metrics.reduce((sum, m) => sum + (m.newUsers || 0), 0),
  })

  const thisMonth = sumMetrics(thisMonthMetrics)
  const lastMonthData = sumMetrics(lastMonthMetrics)

  // 구매 금액 집계
  const sumPurchases = (purchases: typeof thisMonthPurchases) =>
    purchases.reduce((sum, p) => sum + decimalToNumber(p.amount), 0)
  const thisMonthPurchaseTotal = sumPurchases(thisMonthPurchases)
  const lastMonthPurchaseTotal = sumPurchases(lastMonthPurchases)

  // 고객 세그먼트 계산
  const phoneToCustomerId = new Map<string, string>()
  allCustomers.forEach(c => phoneToCustomerId.set(c.phone, c.id))

  const customerVisitDates = new Map<string, Set<string>>()
  const customerLatestVisit = new Map<string, {
    remainingTermTicket: string | null
    remainingTimePackage: string | null
    remainingFixedSeat: string | null
  }>()

  recentVisitors.forEach(v => {
    const custId = v.customerId || phoneToCustomerId.get(v.phone)
    if (!custId) return
    const dateStr = v.visitDate.toISOString().split('T')[0]
    if (!customerVisitDates.has(custId)) customerVisitDates.set(custId, new Set())
    customerVisitDates.get(custId)!.add(dateStr)

    const existing = customerLatestVisit.get(custId)
    if (!existing) {
      customerLatestVisit.set(custId, {
        remainingTermTicket: v.remainingTermTicket,
        remainingTimePackage: v.remainingTimePackage,
        remainingFixedSeat: v.remainingFixedSeat,
      })
    }
  })

  const visitSegmentCounts: Record<VisitSegment, number> = {
    churned: 0, at_risk_14: 0, returned: 0, new_0_7: 0,
    visit_under10: 0, visit_10_20: 0, visit_over20: 0,
  }
  const ticketSegmentCounts: Record<TicketSegment, number> = {
    day_ticket: 0, time_ticket: 0, term_ticket: 0, fixed_ticket: 0,
  }

  allCustomers.forEach(customer => {
    const recentVisits = customerVisitDates.get(customer.id)?.size || 0
    const remaining = customerLatestVisit.get(customer.id)

    const visitSeg = calculateVisitSegment({
      lastVisitDate: customer.lastVisitDate,
      firstVisitDate: customer.firstVisitDate,
      recentVisits,
      referenceDate: thisMonthEnd,
      rangeStart: thirtyDaysAgo,
      previousLastVisitDate: null,
      hasRemainingFixedSeat: !!(remaining?.remainingFixedSeat?.trim()),
    })
    const ticketSeg = calculateTicketSegment({
      hasRemainingTermTicket: !!(remaining?.remainingTermTicket?.trim()),
      hasRemainingTimePackage: !!(remaining?.remainingTimePackage?.trim()),
      hasRemainingFixedSeat: !!(remaining?.remainingFixedSeat?.trim()),
    })

    visitSegmentCounts[visitSeg]++
    ticketSegmentCounts[ticketSeg]++
  })

  // 변화율 계산
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return {
    branchName,
    period: {
      thisMonth: `${currentYear}년 ${currentMonth + 1}월`,
      lastMonth: `${lastMonthYear}년 ${lastMonth}월`,
    },
    revenue: {
      thisMonth,
      lastMonth: lastMonthData,
      change: {
        total: calcChange(thisMonth.total, lastMonthData.total),
        day: calcChange(thisMonth.day, lastMonthData.day),
        time: calcChange(thisMonth.time, lastMonthData.time),
        term: calcChange(thisMonth.term, lastMonthData.term),
      },
    },
    purchase: {
      thisMonth: thisMonthPurchaseTotal,
      lastMonth: lastMonthPurchaseTotal,
      change: calcChange(thisMonthPurchaseTotal, lastMonthPurchaseTotal),
    },
    customers: {
      total: allCustomers.length,
      visitSegments: Object.entries(visitSegmentCounts).map(([seg, count]) => ({
        segment: VISIT_SEGMENT_LABELS[seg as VisitSegment],
        count,
      })),
      ticketSegments: Object.entries(ticketSegmentCounts).map(([seg, count]) => ({
        segment: TICKET_SEGMENT_LABELS[seg as TicketSegment],
        count,
      })),
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChatRequest = await request.json()
    const { message, context, history } = body

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: '메시지를 입력해주세요.' }, { status: 400 })
    }

    // API 키 체크
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json<ChatResponse>({
        success: true,
        message: `[개발 모드] API 키가 설정되지 않았습니다.\n\n받은 질문: "${message}"\n\n실제 분석을 위해서는 환경변수에 ANTHROPIC_API_KEY를 설정해주세요.`,
      })
    }

    // 실제 데이터 조회
    const analyticsData = await fetchAnalyticsData(
      session,
      context?.branchId
    )

    // 컨텍스트 정보 + 실제 데이터
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    const formatNumber = (n: number) => n.toLocaleString('ko-KR')

    let contextInfo = `
## 현재 데이터 (실시간 조회)

**오늘 날짜**: ${currentYear}년 ${currentMonth}월 ${today.getDate()}일
**분석 대상**: ${analyticsData.branchName}

### 매출 현황
| 항목 | ${analyticsData.period.thisMonth} | ${analyticsData.period.lastMonth} | 변화율 |
|------|------:|------:|------:|
| 총 매출 | ${formatNumber(analyticsData.revenue.thisMonth.total)}원 | ${formatNumber(analyticsData.revenue.lastMonth.total)}원 | ${analyticsData.revenue.change.total > 0 ? '+' : ''}${analyticsData.revenue.change.total}% |
| 당일권 | ${formatNumber(analyticsData.revenue.thisMonth.day)}원 | ${formatNumber(analyticsData.revenue.lastMonth.day)}원 | ${analyticsData.revenue.change.day > 0 ? '+' : ''}${analyticsData.revenue.change.day}% |
| 시간권 | ${formatNumber(analyticsData.revenue.thisMonth.time)}원 | ${formatNumber(analyticsData.revenue.lastMonth.time)}원 | ${analyticsData.revenue.change.time > 0 ? '+' : ''}${analyticsData.revenue.change.time}% |
| 기간권 | ${formatNumber(analyticsData.revenue.thisMonth.term)}원 | ${formatNumber(analyticsData.revenue.lastMonth.term)}원 | ${analyticsData.revenue.change.term > 0 ? '+' : ''}${analyticsData.revenue.change.term}% |
| 사물함 | ${formatNumber(analyticsData.revenue.thisMonth.locker)}원 | ${formatNumber(analyticsData.revenue.lastMonth.locker)}원 | - |
| 신규가입 | ${analyticsData.revenue.thisMonth.newUsers}명 | ${analyticsData.revenue.lastMonth.newUsers}명 | - |

### 고객 세그먼트 현황 (전체 ${formatNumber(analyticsData.customers.total)}명)

**방문 기준**:
${analyticsData.customers.visitSegments.map(s => `- ${s.segment}: ${formatNumber(s.count)}명`).join('\n')}

**이용권 기준**:
${analyticsData.customers.ticketSegments.map(s => `- ${s.segment}: ${formatNumber(s.count)}명`).join('\n')}
`

    if (context?.branchName) {
      contextInfo += `\n**프론트엔드 선택 지점**: ${context.branchName}`
    }
    if (context?.dateRange) {
      contextInfo += `\n**프론트엔드 선택 기간**: ${context.dateRange.start} ~ ${context.dateRange.end}`
    }

    // Claude API 호출
    const messages = [
      ...(history || []).map(h => ({
        role: h.role,
        content: h.content,
      })),
      {
        role: 'user' as const,
        content: contextInfo ? `${contextInfo}\n\n질문: ${message}` : message,
      },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Claude API error:', response.status, errorData)

      // 에러 상세 메시지
      let errorMessage = 'AI 응답 생성에 실패했습니다.'
      if (response.status === 401) {
        errorMessage = 'API 키가 유효하지 않습니다.'
      } else if (response.status === 429) {
        errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
      } else if (response.status === 400) {
        errorMessage = '잘못된 요청입니다.'
      }

      return NextResponse.json<ChatResponse>({
        success: false,
        error: errorMessage,
      }, { status: 500 })
    }

    const data = await response.json()
    const assistantMessage = data.content?.[0]?.text || '응답을 생성할 수 없습니다.'

    return NextResponse.json<ChatResponse>({
      success: true,
      message: assistantMessage,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json<ChatResponse>({
      success: false,
      error: '서버 오류가 발생했습니다.',
    }, { status: 500 })
  }
}
