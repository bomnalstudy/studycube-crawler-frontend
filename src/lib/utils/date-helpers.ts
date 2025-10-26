import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * 현재 월의 시작일과 종료일을 반환
 */
export function getCurrentMonthRange() {
  const now = new Date()
  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now)
  }
}

/**
 * 이전 월의 시작일과 종료일을 반환
 */
export function getPreviousMonthRange() {
  const now = new Date()
  const previousMonth = subMonths(now, 1)
  return {
    startDate: startOfMonth(previousMonth),
    endDate: endOfMonth(previousMonth)
  }
}

/**
 * 날짜를 'YYYY-MM-DD' 형식으로 포맷
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * 날짜를 '월/일' 형식으로 포맷
 */
export function formatShortDate(date: Date): string {
  return format(date, 'M/d')
}
