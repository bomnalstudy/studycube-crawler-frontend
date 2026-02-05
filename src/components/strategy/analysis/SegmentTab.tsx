import type { EventPerformanceData } from '@/types/strategy'
import { SegmentTab as SharedSegmentTab } from '@/components/strategy/shared'

interface SegmentTabProps {
  performances: EventPerformanceData[]
}

export function SegmentTab({ performances }: SegmentTabProps) {
  return (
    <SharedSegmentTab
      performances={performances}
      contextLabel="이벤트"
    />
  )
}
