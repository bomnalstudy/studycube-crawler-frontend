'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function PointNodeInner({ data }: NodeProps) {
  const action = (data.action as string) || 'GRANT'
  const amount = (data.amount as number) || 0
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
        <span className="condition-block-icon">🎁</span>
        <div className="condition-block-text">
          <span className="condition-block-label">
            포인트 {action === 'GRANT' ? '지급' : '차감'}
          </span>
          <span className="condition-block-desc">
            {amount > 0 ? `${amount.toLocaleString()}P` : '금액 설정'}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const PointNode = memo(PointNodeInner)
