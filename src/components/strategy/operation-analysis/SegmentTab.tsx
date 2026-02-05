import type { OperationPerformanceData } from '@/types/strategy'
import { SegmentTab as SharedSegmentTab } from '@/components/strategy/shared'

interface SegmentTabProps {
  performances: OperationPerformanceData[]
}

export function SegmentTab({ performances }: SegmentTabProps) {
  return (
    <SharedSegmentTab
      performances={performances}
      contextLabel="운영변경"
    />
  )
}
