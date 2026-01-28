/**
 * KST (한국 표준시, UTC+9) 기반 날짜 유틸리티
 *
 * Vercel(UTC)과 로컬(KST) 환경에서 동일한 날짜 결과를 보장합니다.
 * new Date()는 서버 타임존에 따라 달라지므로,
 * 명시적으로 KST 오프셋을 붙여 일관된 날짜를 생성합니다.
 */

const KST_OFFSET = '+09:00'

/** "YYYY-MM-DD" → KST 시작시간 (00:00:00 KST) */
export function kstStartOfDay(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00' + KST_OFFSET)
}

/** "YYYY-MM-DD" → KST 종료시간 (23:59:59.999 KST) */
export function kstEndOfDay(dateStr: string): Date {
  return new Date(dateStr + 'T23:59:59.999' + KST_OFFSET)
}

/** KST 기준 오늘 날짜 문자열 "YYYY-MM-DD" */
export function getKSTTodayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** KST 기준 어제 날짜 문자열 "YYYY-MM-DD" */
export function getKSTYesterdayStr(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** KST 기준 N일 전 날짜 문자열 "YYYY-MM-DD" */
export function getKSTDaysAgoStr(days: number): string {
  const target = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return target.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}
