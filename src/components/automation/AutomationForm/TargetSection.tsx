'use client'

import { memo, useState } from 'react'
import { FilterConfig } from '@/types/automation'

interface TargetSectionProps {
  config: FilterConfig
  onChange: (config: FilterConfig) => void
}

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

function TargetSectionInner({ config, onChange }: TargetSectionProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('this_month')
  const [daysAgo, setDaysAgo] = useState(7)
  const [conditions, setConditions] = useState<Condition[]>([])

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
      </div>
    </div>
  )
}

export const TargetSection = memo(TargetSectionInner)
