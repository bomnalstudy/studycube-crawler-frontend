'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type ConditionType =
  | 'visit_count'        // 방문 횟수
  | 'days_after_first'   // 첫방문 이후 N일
  | 'days_after_last'    // 마지막방문 이후 N일
  | 'remaining_time'     // 잔여 시간권
  | 'remaining_term'     // 잔여 기간권
  | 'remaining_fixed'    // 잔여 고정석
  | 'total_spent'        // 사용 금액
  | 'inactive_days'      // 미방문 기간

export type CompareOp = 'gte' | 'lte' // 이상, 이하

const CONDITION_CONFIG: Record<ConditionType, { label: string; icon: string; unit: string }> = {
  visit_count: { label: '방문 횟수', icon: '🚶', unit: '회' },
  days_after_first: { label: '첫방문 이후', icon: '🆕', unit: '일' },
  days_after_last: { label: '마지막방문 이후', icon: '📍', unit: '일' },
  remaining_time: { label: '잔여 시간권', icon: '⏱️', unit: '시간' },
  remaining_term: { label: '잔여 기간권', icon: '📅', unit: '일' },
  remaining_fixed: { label: '잔여 고정석', icon: '🪑', unit: '일' },
  total_spent: { label: '사용 금액', icon: '💰', unit: '원' },
  inactive_days: { label: '미방문 기간', icon: '😴', unit: '일' },
}

interface ConditionData {
  conditionType: ConditionType
  operator: CompareOp
  value: number
  onChange?: (data: { operator: CompareOp; value: number }) => void
  onDelete?: () => void
}

function ConditionNodeInner({ data }: NodeProps) {
  const { conditionType, operator, value, onChange, onDelete } = data as unknown as ConditionData
  const config = CONDITION_CONFIG[conditionType]

  const handleOperatorChange = (newOp: CompareOp) => {
    onChange?.({ operator: newOp, value })
  }

  const handleValueChange = (newValue: number) => {
    onChange?.({ operator, value: newValue })
  }

  return (
    <div className="condition-block condition-block-condition">
      <Handle type="target" position={Position.Left} className="node-handle" />
      {onDelete && (
        <button type="button" className="node-delete-btn" onClick={onDelete} title="삭제">
          ×
        </button>
      )}
      <div className="condition-block-body">
        <div className="condition-block-header">
          <span className="condition-block-icon">{config.icon}</span>
          <span className="condition-block-title">{config.label}</span>
        </div>
        <div className="condition-block-inputs">
          <select
            value={operator}
            onChange={e => handleOperatorChange(e.target.value as CompareOp)}
            className="condition-select"
          >
            <option value="gte">이상</option>
            <option value="lte">이하</option>
          </select>
          <input
            type="number"
            min={0}
            value={value}
            onChange={e => handleValueChange(Number(e.target.value))}
            className="condition-input"
          />
          <span className="condition-unit">{config.unit}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}

export const ConditionNode = memo(ConditionNodeInner)
