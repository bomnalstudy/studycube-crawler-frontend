/**
 * 숫자를 천 단위 콤마로 포맷
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

/**
 * 통화 포맷 (원화)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(value)
}

/**
 * 퍼센트 포맷
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Decimal을 숫자로 변환
 */
export function decimalToNumber(decimal: any): number {
  if (typeof decimal === 'number') return decimal
  if (decimal?.toNumber) return decimal.toNumber()
  return parseFloat(decimal?.toString() || '0')
}
