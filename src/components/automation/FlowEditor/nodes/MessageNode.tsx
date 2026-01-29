'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function MessageNodeInner({ data }: NodeProps) {
  const template = (data.template as string) || ''
  const hasContent = template.trim().length > 0
  const onDelete = data.onDelete as (() => void) | undefined

  return (
    <div className="condition-block condition-block-action">
      <Handle type="target" position={Position.Left} className="node-handle" />
      {onDelete && (
        <button type="button" className="node-delete-btn" onClick={onDelete} title="삭제">
          ×
        </button>
      )}
      <div className="condition-block-content">
        <span className="condition-block-icon">💬</span>
        <div className="condition-block-text">
          <span className="condition-block-label">문자 발송</span>
          <span className="condition-block-desc">
            {hasContent ? `${template.slice(0, 15)}...` : 'SMS/LMS'}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const MessageNode = memo(MessageNodeInner)
