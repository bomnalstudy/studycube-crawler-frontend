'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type TicketType = 'fixed' | 'term' | 'time' | 'day'

const TICKET_LABELS: Record<TicketType, string> = {
  fixed: '고정석',
  term: '기간권',
  time: '시간권',
  day: '당일권',
}

const TICKET_ICONS: Record<TicketType, string> = {
  fixed: '🪑',
  term: '📅',
  time: '⏱️',
  day: '🎫',
}

function TicketTypeNodeInner({ data }: NodeProps) {
  const ticketType = data.ticketType as TicketType

  return (
    <div className="condition-block condition-block-ticket">
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="condition-block-content">
        <span className="condition-block-icon">{TICKET_ICONS[ticketType]}</span>
        <span className="condition-block-label">{TICKET_LABELS[ticketType]}</span>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const TicketTypeNode = memo(TicketTypeNodeInner)
