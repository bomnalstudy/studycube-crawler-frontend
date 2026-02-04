/**
 * 이벤트/운영변경 분석 기간 및 조건 계산 유틸
 *
 * 분석 기간 = 최소 30일 보장
 * - 이벤트 10일 → 분석기간 30일 (이벤트 후 20일 포함)
 * - 이벤트 45일 → 분석기간 45일 (이벤트 기간 그대로)
 */

const MIN_ANALYSIS_DAYS = 30

/** 이벤트 진행 일수 (inclusive) */
export function getEventDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/** 실제 분석 기간 일수 (최소 30일) */
export function getAnalysisDurationDays(startDate: string, endDate: string): number {
  const duration = getEventDurationDays(startDate, endDate)
  return Math.max(MIN_ANALYSIS_DAYS, duration)
}

/** 분석 종료일 (이 날짜까지의 데이터를 분석에 포함) */
export function getAnalysisEndDate(startDate: string, endDate: string): Date {
  const analysisDays = getAnalysisDurationDays(startDate, endDate)
  const start = new Date(startDate)
  const analysisEnd = new Date(start)
  analysisEnd.setDate(analysisEnd.getDate() + analysisDays - 1)
  return analysisEnd
}

/** 분석 가능 여부 (분석 기간이 경과했고 상태가 COMPLETED인 경우) */
export function isAnalysisReady(
  startDate: string,
  endDate: string,
  status: string,
): boolean {
  if (status !== 'COMPLETED') return false
  const analysisEnd = getAnalysisEndDate(startDate, endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today > analysisEnd
}

/** 분석 가능 예정일 (분석 기간 종료일 다음 날) */
export function getAnalysisReadyDate(startDate: string, endDate: string): Date {
  const analysisEnd = getAnalysisEndDate(startDate, endDate)
  const readyDate = new Date(analysisEnd)
  readyDate.setDate(readyDate.getDate() + 1)
  return readyDate
}

/** 날짜를 YYYY-MM-DD 포맷으로 변환 */
export function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}
