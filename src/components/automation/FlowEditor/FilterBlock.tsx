'use client'

import { FilterConfig } from '@/types/automation'
import { VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS } from '@/types/crm'
import './FlowEditor.css'

interface FilterBlockProps {
  config: FilterConfig
  onChange: (config: FilterConfig) => void
}

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대 이상']
const GENDERS = [
  { value: '남', label: '남성' },
  { value: '여', label: '여성' },
]

export function FilterBlock({ config, onChange }: FilterBlockProps) {
  const toggleArrayItem = (key: keyof FilterConfig, value: string) => {
    const current = (config[key] as string[]) || []
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    onChange({ ...config, [key]: next.length > 0 ? next : undefined })
  }

  return (
    <div className="editor-block editor-block-filter">
      <div className="editor-block-header">
        <span className="editor-block-icon">🎯</span>
        <span className="editor-block-title">대상 (누구에게)</span>
      </div>
      <div className="editor-block-body">
        {/* 방문 세그먼트 */}
        <div className="editor-field">
          <label className="editor-label">방문 세그먼트</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(VISIT_SEGMENT_LABELS).map(([key, label]) => {
              const selected = config.visitSegments?.includes(key) ?? false
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleArrayItem('visitSegments', key)}
                  className={`editor-chip ${selected ? 'editor-chip-active' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 이용권 세그먼트 */}
        <div className="editor-field">
          <label className="editor-label">이용권 유형</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TICKET_SEGMENT_LABELS).map(([key, label]) => {
              const selected = config.ticketSegments?.includes(key) ?? false
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleArrayItem('ticketSegments', key)}
                  className={`editor-chip ${selected ? 'editor-chip-active' : ''}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 연령대 */}
        <div className="editor-field">
          <label className="editor-label">연령대</label>
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUPS.map(age => {
              const selected = config.ageGroups?.includes(age) ?? false
              return (
                <button
                  key={age}
                  type="button"
                  onClick={() => toggleArrayItem('ageGroups', age)}
                  className={`editor-chip ${selected ? 'editor-chip-active' : ''}`}
                >
                  {age}
                </button>
              )
            })}
          </div>
        </div>

        {/* 성별 */}
        <div className="editor-field">
          <label className="editor-label">성별</label>
          <div className="flex gap-1.5">
            {GENDERS.map(g => {
              const selected = config.genders?.includes(g.value) ?? false
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleArrayItem('genders', g.value)}
                  className={`editor-chip ${selected ? 'editor-chip-active' : ''}`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 미방문 기간 */}
        <div className="editor-field">
          <label className="editor-label">미방문 기간 (일 이상)</label>
          <input
            type="number"
            min={0}
            value={config.inactiveDays || ''}
            onChange={e => onChange({
              ...config,
              inactiveDays: e.target.value ? Number(e.target.value) : undefined,
            })}
            placeholder="예: 14"
            className="editor-input w-32"
          />
        </div>
      </div>
    </div>
  )
}
