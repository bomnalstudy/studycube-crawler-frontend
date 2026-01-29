'use client'

import { memo, useState } from 'react'
import { FilterConfig } from '@/types/automation'

interface TargetSectionProps {
  config: FilterConfig
  onChange: (config: FilterConfig) => void
}

type TargetMode = 'condition' | 'manual'
type DateRangeType = 'this_month' | 'this_week' | 'yesterday' | 'total' | 'days_ago'
type ConditionType = 'visit_count' | 'days_after_first' | 'days_after_last' | 'remaining_time' | 'remaining_term' | 'remaining_fixed' | 'total_spent' | 'inactive_days'
type CompareOp = 'gte' | 'lte'

interface Condition {
  id: string
  type: ConditionType
  operator: CompareOp
  value: number
}

const DATE_RANGE_OPTIONS: { value: DateRangeType; label: string }[] = [
  { value: 'this_month', label: '이번달' },
  { value: 'this_week', label: '이번주' },
  { value: 'yesterday', label: '어제' },
  { value: 'total', label: '전체 기간' },
  { value: 'days_ago', label: '직접 입력' },
]

const CONDITION_OPTIONS: { value: ConditionType; label: string; unit: string }[] = [
  { value: 'visit_count', label: '방문 횟수', unit: '회' },
  { value: 'days_after_first', label: '첫방문 이후', unit: '일' },
  { value: 'days_after_last', label: '마지막방문 이후', unit: '일' },
  { value: 'remaining_time', label: '잔여 시간권', unit: '시간' },
  { value: 'remaining_term', label: '잔여 기간권', unit: '일' },
  { value: 'remaining_fixed', label: '잔여 고정석', unit: '일' },
  { value: 'total_spent', label: '사용 금액', unit: '원' },
  { value: 'inactive_days', label: '미방문 기간', unit: '일' },
]

// 전화번호 정규화 (숫자만 추출)
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

// 전화번호 포맷팅 (010-1234-5678)
function formatPhone(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return digits
}

function TargetSectionInner({ config, onChange }: TargetSectionProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('this_month')
  const [daysAgo, setDaysAgo] = useState(7)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [phoneInput, setPhoneInput] = useState('')

  const targetMode = config.targetMode || 'condition'
  const manualPhones = config.manualPhones || []

  const handleModeChange = (mode: TargetMode) => {
    onChange({ ...config, targetMode: mode })
  }

  const addPhone = () => {
    const normalized = normalizePhone(phoneInput)
    if (normalized.length >= 10 && !manualPhones.includes(normalized)) {
      onChange({ ...config, manualPhones: [...manualPhones, normalized] })
      setPhoneInput('')
    }
  }

  const removePhone = (phone: string) => {
    onChange({ ...config, manualPhones: manualPhones.filter(p => p !== phone) })
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPhone()
    }
  }

  const addCondition = () => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      type: 'visit_count',
      operator: 'gte',
      value: 1,
    }
    setConditions([...conditions, newCondition])
  }

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map(c => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  const getConditionConfig = (type: ConditionType) => {
    return CONDITION_OPTIONS.find(opt => opt.value === type)!
  }

  return (
    <div className="form-section" style={{ borderRight: '1px solid #E5E7EB' }}>
      <div className="form-section-header">
        <span className="form-section-number">2</span>
        <span className="form-section-title">누구에게</span>
      </div>

      <div className="form-section-content">
        {/* 대상 선택 모드 */}
        <div>
          <span className="form-label">대상 선택 방식</span>
          <div className="form-radio-group">
            <label className="form-radio">
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'condition'}
                onChange={() => handleModeChange('condition')}
              />
              <span>조건 기반</span>
            </label>
            <label className="form-radio">
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'manual'}
                onChange={() => handleModeChange('manual')}
              />
              <span>직접 입력</span>
            </label>
          </div>
        </div>

        {/* 직접 입력 모드 */}
        {targetMode === 'manual' && (
          <div>
            <span className="form-label">전화번호 입력</span>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                onKeyDown={handlePhoneKeyDown}
                placeholder="010-1234-5678"
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={addPhone}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
              >
                추가
              </button>
            </div>
            {manualPhones.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
                {manualPhones.map(phone => (
                  <span
                    key={phone}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                  >
                    {formatPhone(phone)}
                    <button
                      type="button"
                      onClick={() => removePhone(phone)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {manualPhones.length}명 선택됨
            </p>
          </div>
        )}

        {/* 조건 기반 모드 */}
        {targetMode === 'condition' && (
          <>
            {/* 날짜 범위 */}
            <div>
              <span className="form-label">기간</span>
              <div className="flex items-center gap-2">
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value as DateRangeType)}
                  className="form-select"
                  style={{ width: 'auto', flex: 1 }}
                >
                  {DATE_RANGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {dateRange === 'days_ago' && (
                  <>
                    <span className="text-sm text-gray-500">오늘 기준</span>
                    <input
                      type="number"
                      min={1}
                      value={daysAgo}
                      onChange={e => setDaysAgo(Number(e.target.value))}
                      className="form-input form-input-sm"
                    />
                    <span className="text-sm text-gray-500">일 전</span>
                  </>
                )}
              </div>
            </div>

            {/* 조건 리스트 */}
            <div>
              <span className="form-label">조건</span>
          <div className="flex flex-col gap-2">
            {conditions.map(condition => {
              const condConfig = getConditionConfig(condition.type)
              return (
                <div key={condition.id} className="condition-card">
                  <select
                    value={condition.type}
                    onChange={e => updateCondition(condition.id, { type: e.target.value as ConditionType })}
                    className="condition-card-select"
                  >
                    {CONDITION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={e => updateCondition(condition.id, { operator: e.target.value as CompareOp })}
                    className="condition-card-select"
                    style={{ width: '70px' }}
                  >
                    <option value="gte">이상</option>
                    <option value="lte">이하</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={condition.value}
                    onChange={e => updateCondition(condition.id, { value: Number(e.target.value) })}
                    className="condition-card-input"
                  />
                  <span className="condition-card-unit">{condConfig.unit}</span>
                  <button
                    type="button"
                    onClick={() => removeCondition(condition.id)}
                    className="condition-card-delete"
                  >
                    ×
                  </button>
                </div>
              )
            })}

            <button type="button" onClick={addCondition} className="add-condition-btn">
              <span>+</span>
              <span>조건 추가</span>
            </button>
          </div>
        </div>
          </>
        )}

        {/* 중복 발송 방지 */}
        <div>
          <span className="form-label">중복 발송 방지</span>
          <div className="flex flex-col gap-3">
            {/* 최대 발송 횟수 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.maxSendsPerCustomer !== null && config.maxSendsPerCustomer !== undefined}
                onChange={e => {
                  onChange({
                    ...config,
                    maxSendsPerCustomer: e.target.checked ? 1 : null,
                  })
                }}
                className="form-checkbox"
              />
              <span className="text-sm text-gray-700">동일 고객 최대</span>
              {config.maxSendsPerCustomer !== null && config.maxSendsPerCustomer !== undefined && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={config.maxSendsPerCustomer}
                    onChange={e => onChange({ ...config, maxSendsPerCustomer: Number(e.target.value) })}
                    className="form-input form-input-sm"
                    style={{ width: '60px' }}
                  />
                  <span className="text-sm text-gray-500">회까지만 발송</span>
                </>
              )}
            </label>

            {/* 재발송 대기 기간 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.sendCooldownDays !== null && config.sendCooldownDays !== undefined}
                onChange={e => {
                  onChange({
                    ...config,
                    sendCooldownDays: e.target.checked ? 30 : null,
                  })
                }}
                className="form-checkbox"
              />
              <span className="text-sm text-gray-700">재발송 대기</span>
              {config.sendCooldownDays !== null && config.sendCooldownDays !== undefined && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={config.sendCooldownDays}
                    onChange={e => onChange({ ...config, sendCooldownDays: Number(e.target.value) })}
                    className="form-input form-input-sm"
                    style={{ width: '60px' }}
                  />
                  <span className="text-sm text-gray-500">일</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TargetSection = memo(TargetSectionInner)
