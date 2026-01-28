'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { TriggerConfig, TriggerType } from '@/types/automation'

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  recurring: '반복 실행',
  scheduled: '예약 실행',
  manual: '수동 실행',
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function TriggerNodeInner({ data }: NodeProps) {
  const config = data.config as TriggerConfig
  const onChange = data.onChange as (config: TriggerConfig) => void

  const handleTypeChange = (type: TriggerType) => {
    if (type === 'manual') onChange({ type: 'manual' })
    else if (type === 'scheduled') onChange({ type: 'scheduled', time: config.time || '10:00' })
    else onChange({ type: 'recurring', time: config.time || '10:00', recurring: config.recurring || { frequency: 'daily' } })
  }

  return (
    <div className="node-card node-trigger">
      <div className="node-header node-header-trigger">⏰ 트리거 (언제)</div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">실행 유형</span>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`node-chip ${config.type === type ? 'node-chip-active' : ''}`}
              >
                {TRIGGER_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {config.type !== 'manual' && (
          <div className="node-field">
            <span className="node-label">시각</span>
            <input
              type="time" min="09:00" max="21:00"
              value={config.time || '10:00'}
              onChange={e => onChange({ ...config, time: e.target.value })}
              className="node-input w-28"
            />
          </div>
        )}

        {config.type === 'recurring' && (
          <>
            <div className="node-field">
              <span className="node-label">주기</span>
              <select
                value={config.recurring?.frequency || 'daily'}
                onChange={e => onChange({ ...config, recurring: { ...config.recurring, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' } })}
                className="node-input w-28"
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
            </div>

            {config.recurring?.frequency === 'weekly' && (
              <div className="node-field">
                <span className="node-label">요일</span>
                <div className="flex gap-1">
                  {DAYS.map((day, i) => {
                    const sel = config.recurring?.daysOfWeek?.includes(i) ?? false
                    return (
                      <button key={i} type="button"
                        onClick={() => {
                          const cur = config.recurring?.daysOfWeek || []
                          const next = sel ? cur.filter(d => d !== i) : [...cur, i]
                          onChange({ ...config, recurring: { ...config.recurring!, daysOfWeek: next } })
                        }}
                        className={`w-7 h-7 text-[10px] rounded-full ${sel ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                      >{day}</button>
                    )
                  })}
                </div>
              </div>
            )}

            {config.recurring?.frequency === 'monthly' && (
              <div className="node-field">
                <span className="node-label">매월</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={31}
                    value={config.recurring?.dayOfMonth || 1}
                    onChange={e => onChange({ ...config, recurring: { ...config.recurring!, dayOfMonth: Number(e.target.value) } })}
                    className="node-input w-16"
                  />
                  <span className="text-xs text-gray-400">일</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const TriggerNode = memo(TriggerNodeInner)
