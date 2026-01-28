'use client'

import { TriggerConfig, TriggerType } from '@/types/automation'
import './FlowEditor.css'

interface TriggerBlockProps {
  config: TriggerConfig
  onChange: (config: TriggerConfig) => void
}

const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  recurring: '반복 실행',
  scheduled: '예약 실행',
  manual: '수동 실행',
}

export function TriggerBlock({ config, onChange }: TriggerBlockProps) {
  const handleTypeChange = (type: TriggerType) => {
    if (type === 'manual') {
      onChange({ type: 'manual' })
    } else if (type === 'scheduled') {
      onChange({ type: 'scheduled', time: config.time || '10:00' })
    } else {
      onChange({
        type: 'recurring',
        time: config.time || '10:00',
        recurring: config.recurring || { frequency: 'daily' },
      })
    }
  }

  return (
    <div className="editor-block editor-block-trigger">
      <div className="editor-block-header">
        <span className="editor-block-icon">⏰</span>
        <span className="editor-block-title">트리거 (언제)</span>
      </div>
      <div className="editor-block-body">
        {/* 실행 유형 */}
        <div className="editor-field">
          <label className="editor-label">실행 유형</label>
          <div className="flex gap-2">
            {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerType[]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`editor-chip ${config.type === type ? 'editor-chip-active' : ''}`}
              >
                {TRIGGER_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 시간 설정 (수동이 아닐 때) */}
        {config.type !== 'manual' && (
          <div className="editor-field">
            <label className="editor-label">실행 시각</label>
            <input
              type="time"
              min="09:00"
              max="21:00"
              value={config.time || '10:00'}
              onChange={e => onChange({ ...config, time: e.target.value })}
              className="editor-input w-32"
            />
            <span className="text-xs text-gray-400 ml-2">오전 9시 ~ 오후 9시</span>
          </div>
        )}

        {/* 반복 설정 */}
        {config.type === 'recurring' && (
          <>
            <div className="editor-field">
              <label className="editor-label">반복 주기</label>
              <select
                value={config.recurring?.frequency || 'daily'}
                onChange={e => onChange({
                  ...config,
                  recurring: { ...config.recurring, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' },
                })}
                className="editor-input w-40"
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
            </div>

            {config.recurring?.frequency === 'weekly' && (
              <div className="editor-field">
                <label className="editor-label">요일 선택</label>
                <div className="flex gap-1.5">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => {
                    const selected = config.recurring?.daysOfWeek?.includes(i) ?? false
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const current = config.recurring?.daysOfWeek || []
                          const next = selected ? current.filter(d => d !== i) : [...current, i]
                          onChange({
                            ...config,
                            recurring: { ...config.recurring!, daysOfWeek: next },
                          })
                        }}
                        className={`w-8 h-8 text-xs rounded-full transition-colors ${
                          selected
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {config.recurring?.frequency === 'monthly' && (
              <div className="editor-field">
                <label className="editor-label">매월</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={config.recurring?.dayOfMonth || 1}
                    onChange={e => onChange({
                      ...config,
                      recurring: { ...config.recurring!, dayOfMonth: Number(e.target.value) },
                    })}
                    className="editor-input w-20"
                  />
                  <span className="text-sm text-gray-500">일</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
