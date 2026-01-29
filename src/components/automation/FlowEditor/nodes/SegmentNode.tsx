'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { VisitSegment, VISIT_SEGMENT_LABELS } from '@/types/crm'

const SEGMENT_ICONS: Record<VisitSegment, string> = {
  churned: '💤',
  at_risk_14: '⚠️',
  returned: '🔙',
  new_0_7: '🆕',
  visit_under10: '👤',
  visit_10_20: '⭐',
  visit_over20: '👑',
}

const SEGMENT_COLORS: Record<VisitSegment, string> = {
  churned: '#991B1B',
  at_risk_14: '#F97316',
  returned: '#8B5CF6',
  new_0_7: '#22C55E',
  visit_under10: '#6B7280',
  visit_10_20: '#06B6D4',
  visit_over20: '#F59E0B',
}

function SegmentNodeInner({ data }: NodeProps) {
  const segment = data.segment as VisitSegment
  const color = SEGMENT_COLORS[segment]

  return (
    <div
      className="condition-block condition-block-segment"
      style={{ '--segment-color': color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="condition-block-content">
        <span className="condition-block-icon">{SEGMENT_ICONS[segment]}</span>
        <span className="condition-block-label">{VISIT_SEGMENT_LABELS[segment]}</span>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const SegmentNode = memo(SegmentNodeInner)
