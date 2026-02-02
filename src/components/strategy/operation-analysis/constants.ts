export const VERDICT_STYLES = {
  EXCELLENT: { bg: 'bg-green-100', text: 'text-green-700', label: '매우 좋음' },
  GOOD: { bg: 'bg-blue-100', text: 'text-blue-700', label: '좋음' },
  NEUTRAL: { bg: 'bg-gray-100', text: 'text-gray-700', label: '보통' },
  POOR: { bg: 'bg-orange-100', text: 'text-orange-700', label: '미흡' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: '실패' },
} as const

export type VerdictType = keyof typeof VERDICT_STYLES
