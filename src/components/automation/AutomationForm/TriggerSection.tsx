'use client'

import { memo, useState } from 'react'
import { TriggerConfig, TriggerType } from '@/types/automation'

interface TriggerSectionProps {
  config: TriggerConfig
  onChange: (config: TriggerConfig) => void
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'recurring', label: '반복 실행' },
  { value: 'scheduled', label: '예약 실행' },
  { value: 'manual', label: '수동 실행' },
]

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'custom'

function TriggerSectionInner({ config, onChange }: TriggerSectionProps) {
  const [frequencyMode, setFrequencyMode] = useState<FrequencyType>(
    config.recurring?.frequency || 'daily'
  )
  const [customDays, setCustomDays] = useState(config.recurring?.customIntervalDays || 3)

  const handleTypeChange = (type: TriggerType) => {
    if (type === 'manual') {
      onChange({ type: 'manual' })
    } else if (type === 'scheduled') {
      // 오늘 날짜를 기본값으로
      const today = new Date().toISOString().split('T')[0]
      onChange({ type: 'scheduled', time: config.time || '10:00', scheduledDate: today })
    } else {
      onChange({
        type: 'recurring',
        time: config.time || '10:00',
        recurring: config.recurring || { frequency: 'daily' },
      })
    }
  }

  const handleFrequencyChange = (freq: FrequencyType) => {
    setFrequencyMode(freq)
    if (freq === 'custom') {
      onChange({
        ...config,
        recurring: {
          ...config.recurring,
          frequency: 'custom',
          customIntervalDays: customDays,
        },
      })
    } else {
      onChange({
        ...config,
        recurring: {
          ...config.recurring,
          frequency: freq,
        },
      })
    }
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="form-section-number">1</span>
        <span className="form-section-title">언제</span>
      </div>

      <div className="form-section-content">
        {/* 실행 유형 */}
        <div>
          <span className="form-label">실행 유형</span>
          <div className="form-radio-group">
            {TRIGGER_OPTIONS.map(opt => (
              <label key={opt.value} className="form-radio">
                <input
                  type="radio"
                  name="triggerType"
                  checked={config.type === opt.value}
                  onChange={() => handleTypeChange(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 예약 실행: 날짜 선택 */}
        {config.type === 'scheduled' && (
          <div>
            <span className="form-label">실행 날짜</span>
            <input
              type="date"
              value={config.scheduledDate || new Date().toISOString().split('T')[0]}
              onChange={e => onChange({ ...config, scheduledDate: e.target.value })}
              className="form-input"
            />
          </div>
        )}

        {/* 시간 설정 */}
        {config.type !== 'manual' && (
          <div>
            <span className="form-label">실행 시간</span>
            <input
              type="time"
              min="09:00"
              max="21:00"
              value={config.time || '10:00'}
              onChange={e => onChange({ ...config, time: e.target.value })}
              className="form-input"
            />
          </div>
        )}

        {/* 반복 주기 */}
        {config.type === 'recurring' && (
          <>
            <div>
              <span className="form-label">반복 주기</span>
              <select
                value={frequencyMode}
                onChange={e => handleFrequencyChange(e.target.value as FrequencyType)}
                className="form-select"
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
                <option value="custom">직접 입력</option>
              </select>
            </div>

            {/* 직접 입력 (N일마다) */}
            {frequencyMode === 'custom' && (
              <div>
                <span className="form-label">반복 간격</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={e => {
                      const days = Number(e.target.value)
                      setCustomDays(days)
                      onChange({
                        ...config,
                        recurring: { ...config.recurring!, customIntervalDays: days },
                      })
                    }}
                    className="form-input form-input-sm"
                  />
                  <span className="text-sm text-gray-500">일마다</span>
                </div>
              </div>
            )}

            {/* 요일 선택 (매주) */}
            {frequencyMode === 'weekly' && (
              <div>
                <span className="form-label">요일</span>
                <div className="flex gap-1">
                  {DAYS.map((day, i) => {
                    const selected = config.recurring?.daysOfWeek?.includes(i) ?? false
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const cur = config.recurring?.daysOfWeek || []
                          const next = selected ? cur.filter(d => d !== i) : [...cur, i]
                          onChange({
                            ...config,
                            recurring: { ...config.recurring!, daysOfWeek: next },
                          })
                        }}
                        className={`w-8 h-8 text-xs rounded-full border ${
                          selected
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-500 border-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 일자 선택 (매월) */}
            {frequencyMode === 'monthly' && (
              <div>
                <span className="form-label">매월</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={config.recurring?.dayOfMonth || 1}
                    onChange={e =>
                      onChange({
                        ...config,
                        recurring: { ...config.recurring!, dayOfMonth: Number(e.target.value) },
                      })
                    }
                    className="form-input form-input-sm"
                  />
                  <span className="text-sm text-gray-500">일</span>
                </div>
              </div>
            )}

            {/* 반복 종료 날짜 */}
            <div>
              <span className="form-label">종료 날짜 (선택)</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!config.recurring?.endDate}
                  onChange={e => {
                    if (e.target.checked) {
                      // 기본값: 한 달 뒤
                      const nextMonth = new Date()
                      nextMonth.setMonth(nextMonth.getMonth() + 1)
                      onChange({
                        ...config,
                        recurring: { ...config.recurring!, endDate: nextMonth.toISOString().split('T')[0] },
                      })
                    } else {
                      const { endDate, ...rest } = config.recurring || {}
                      onChange({ ...config, recurring: { ...rest, frequency: rest.frequency || 'daily' } })
                    }
                  }}
                  className="form-checkbox"
                />
                {config.recurring?.endDate ? (
                  <>
                    <input
                      type="date"
                      value={config.recurring.endDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e =>
                        onChange({
                          ...config,
                          recurring: { ...config.recurring!, endDate: e.target.value },
                        })
                      }
                      className="form-input"
                      style={{ width: 'auto' }}
                    />
                    <span className="text-sm text-gray-500">까지</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">종료 없이 계속 반복</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export const TriggerSection = memo(TriggerSectionInner)
