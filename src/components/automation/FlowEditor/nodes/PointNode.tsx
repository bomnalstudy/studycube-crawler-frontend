'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { PointConfig, PointAction } from '@/types/automation'

function PointNodeInner({ data }: NodeProps) {
  const config = data.config as PointConfig
  const onChange = data.onChange as (config: PointConfig) => void

  return (
    <div className="node-card node-point">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="node-header node-header-point">🎁 포인트 (지급/차감)</div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">액션</span>
          <div className="flex gap-1.5">
            {(['GRANT', 'DEDUCT'] as PointAction[]).map(a => (
              <button key={a} type="button"
                onClick={() => onChange({ ...config, action: a })}
                className={`node-chip ${config.action === a ? 'node-chip-active' : ''}`}
              >{a === 'GRANT' ? '지급' : '차감'}</button>
            ))}
          </div>
        </div>

        <div className="node-field">
          <span className="node-label">포인트</span>
          <div className="flex items-center gap-1">
            <input type="number" min={0} step={100}
              value={config.amount}
              onChange={e => onChange({ ...config, amount: Number(e.target.value) })}
              className="node-input w-24"
            />
            <span className="text-xs text-gray-400">P</span>
          </div>
        </div>

        <div className="node-field">
          <span className="node-label">사유</span>
          <input type="text"
            value={config.reason}
            onChange={e => onChange({ ...config, reason: e.target.value })}
            placeholder="예: 이탈위험 복귀 보너스"
            className="node-input w-full"
          />
        </div>

        {config.action === 'GRANT' && (
          <div className="node-field">
            <span className="node-label">유효기간</span>
            <div className="flex items-center gap-1">
              <input type="number" min={1}
                value={config.expiryDays}
                onChange={e => onChange({ ...config, expiryDays: Number(e.target.value) })}
                className="node-input w-16"
              />
              <span className="text-xs text-gray-400">일</span>
            </div>
          </div>
        )}

        <div className="node-field">
          <span className="node-label">중복 방지</span>
          <div className="flex items-center gap-1">
            <input type="number" min={0}
              value={config.deduplicateDays ?? ''}
              onChange={e => onChange({ ...config, deduplicateDays: e.target.value ? Number(e.target.value) : null })}
              placeholder="미설정"
              className="node-input w-16"
            />
            <span className="text-xs text-gray-400">일</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const PointNode = memo(PointNodeInner)
