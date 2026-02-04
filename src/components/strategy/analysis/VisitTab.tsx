import type { EventPerformanceData } from '@/types/strategy'
import { VisitTab as SharedVisitTab } from '@/components/strategy/shared'

interface VisitTabProps {
  performances: EventPerformanceData[]
}

export function VisitTab({ performances }: VisitTabProps) {
  return <SharedVisitTab performances={performances} />
}
