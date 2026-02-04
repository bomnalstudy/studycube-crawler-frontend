export const VERDICT_STYLES = {
  EXCELLENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '매우 좋음' },
  GOOD: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '좋음' },
  NEUTRAL: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: '보통' },
  POOR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: '미흡' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '실패' },
} as const

export const SEGMENT_TEXT_COLORS: Record<string, string> = {
  'VIP': '#F59E0B',
  '단골': '#06B6D4',
  '일반': '#6B7280',
  '신규': '#22C55E',
  '이탈위험': '#F97316',
  '이탈': '#991B1B',
  '복귀': '#8B5CF6',
}

export type VerdictType = keyof typeof VERDICT_STYLES
