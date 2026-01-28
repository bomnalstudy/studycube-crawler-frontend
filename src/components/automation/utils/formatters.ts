import { TriggerConfig } from '@/types/automation'

const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']

export function formatTriggerSummary(config: TriggerConfig): string {
  if (!config) return '-'

  if (config.type === 'manual') return '수동 실행'

  const time = config.time || '09:00'

  if (config.type === 'scheduled') {
    return `${time} 예약`
  }

  if (config.type === 'recurring' && config.recurring) {
    const { frequency, daysOfWeek, dayOfMonth } = config.recurring
    switch (frequency) {
      case 'daily':
        return `매일 ${time}`
      case 'weekly':
        if (daysOfWeek && daysOfWeek.length > 0) {
          const days = daysOfWeek.map(d => DAYS_OF_WEEK[d]).join(', ')
          return `매주 ${days} ${time}`
        }
        return `매주 ${time}`
      case 'monthly':
        return `매월 ${dayOfMonth || 1}일 ${time}`
      default:
        return `${time}`
    }
  }

  return config.time || '-'
}

export function calculateByteCount(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes += code > 127 ? 2 : 1
  }
  return bytes
}

export function getMessageType(text: string): 'SMS' | 'LMS' {
  return calculateByteCount(text) > 90 ? 'LMS' : 'SMS'
}
