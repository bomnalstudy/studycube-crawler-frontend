import { Decimal } from '@prisma/client/runtime/library'

// 대시보드 메트릭 타입
export interface DashboardMetrics {
  // 이번달 신규 이용자
  newUsersThisMonth: number

  // 이번달 평균 하루 이용권 사용 내역
  avgDailyTicketUsage: number

  // 이번달 총 매출 중 이용권 타입별 비율
  revenueByTicketType: {
    day: number
    hour: number
    period: number
  }

  // 이전 달 대비 매출 상승률
  revenueGrowthRate: number

  // 월별 매장 매출 합계
  monthlyRevenue: number

  // 일 평균 매출
  avgDailyRevenue: number

  // 일 평균 매출 변화율
  avgDailyRevenueGrowthRate: number

  // 일주일 재방문자 수
  weeklyRevisitData: {
    visitCount: number // 1회, 2회, 3회, 4회 이상
    count: number
  }[]

  // 고객 나이대 및 성별
  customerDemographics: {
    ageGroup: string
    gender: string
    count: number
  }[]

  // 시간대별 이용자 수
  hourlyUsageData: {
    hour: number
    count: number
  }[]

  // 이용권별 매출 Top 10
  ticketRevenueTop10: {
    ticketName: string
    revenue: number
  }[]
}

// 차트 데이터 타입
export interface BarChartData {
  label: string
  value: number
}

export interface DonutChartData {
  name: string
  value: number
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
