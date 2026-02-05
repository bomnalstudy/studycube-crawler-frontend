import type { OperationPerformanceData } from '@/types/strategy'
import { TicketTab as SharedTicketTab } from '@/components/strategy/shared'
import type { AnalysisSummary } from './types'

interface TicketTabProps {
  performances: OperationPerformanceData[]
  summary: AnalysisSummary
}

export function TicketTab({ performances, summary }: TicketTabProps) {
  return <SharedTicketTab performances={performances} summary={summary} />
}
