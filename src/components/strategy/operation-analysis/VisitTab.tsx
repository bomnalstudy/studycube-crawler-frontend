import type { OperationPerformanceData } from '@/types/strategy'
import { VisitTab as SharedVisitTab } from '@/components/strategy/shared'

interface VisitTabProps {
  performances: OperationPerformanceData[]
}

export function VisitTab({ performances }: VisitTabProps) {
  return <SharedVisitTab performances={performances} />
}
