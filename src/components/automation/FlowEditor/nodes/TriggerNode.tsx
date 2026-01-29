'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type TriggerType = 'recurring' | 'scheduled' | 'manual'

const TRIGGER_LABELS: Record<TriggerType, string> = {
  recurring: '반복 실행',
  scheduled: '예약 실행',
  manual: '수동 실행',
}

const TRIGGER_ICONS: Record<TriggerType, string> = {
  recurring: '🔄',
  scheduled: '📅',
  manual: '👆',
}

const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  recurring: '매일/매주/매월',
  scheduled: '특정 날짜/시간',
  manual: '버튼 클릭',
}

function TriggerNodeInner({ data }: NodeProps) {
  const triggerType = (data.triggerType as TriggerType) || 'manual'
  const onDelete = data.onDelete as (() => void) | undefined

  return (
    <div className="condition-block condition-block-trigger">
      {onDelete && (
        <button type="button" className="node-delete-btn" onClick={onDelete} title="삭제">
          ×
        </button>
      )}
      <div className="condition-block-content">
        <span className="condition-block-icon">{TRIGGER_ICONS[triggerType]}</span>
        <div className="condition-block-text">
          <span className="condition-block-label">{TRIGGER_LABELS[triggerType]}</span>
          <span className="condition-block-desc">{TRIGGER_DESCRIPTIONS[triggerType]}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const TriggerNode = memo(TriggerNodeInner)
