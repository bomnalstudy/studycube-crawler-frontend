'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type DateRangeType = 'this_month' | 'this_week' | 'yesterday' | 'total' | 'days_ago'

const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  this_month: '이번달',
  this_week: '이번주',
  yesterday: '어제',
  total: '총',
  days_ago: 'N일 전',
}

const DATE_RANGE_ICONS: Record<DateRangeType, string> = {
  this_month: '📅',
  this_week: '📆',
  yesterday: '⬅️',
  total: '📊',
  days_ago: '🔢',
}

interface DateRangeData {
  dateRangeType: DateRangeType
  daysAgo?: number
  onChange?: (data: { daysAgo: number }) => void
  onDelete?: () => void
}

function DateRangeNodeInner({ data }: NodeProps) {
  const { dateRangeType, daysAgo, onChange, onDelete } = data as unknown as DateRangeData

  return (
    <div className="condition-block condition-block-date">
      <Handle type="target" position={Position.Left} className="node-handle" />
      {onDelete && (
        <button type="button" className="node-delete-btn" onClick={onDelete} title="삭제">
          ×
        </button>
      )}
      <div className="condition-block-content">
        <span className="condition-block-icon">{DATE_RANGE_ICONS[dateRangeType]}</span>
        {dateRangeType === 'days_ago' ? (
          <div className="condition-block-inputs-inline">
            <input
              type="number"
              min={1}
              value={daysAgo || 7}
              onChange={e => onChange?.({ daysAgo: Number(e.target.value) })}
              className="condition-input-small"
            />
            <span className="condition-block-label">일 전</span>
          </div>
        ) : (
          <span className="condition-block-label">{DATE_RANGE_LABELS[dateRangeType]}</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const DateRangeNode = memo(DateRangeNodeInner)
