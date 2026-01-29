'use client'

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FilterConfig, DateCondition } from '@/types/automation'
import { VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS } from '@/types/crm'

type FilterMode = 'segment' | 'date'

function FilterNodeInner({ data }: NodeProps) {
  const config = data.config as FilterConfig
  const onChange = data.onChange as (config: FilterConfig) => void
  const [mode, setMode] = useState<FilterMode>(config.dateCondition ? 'date' : 'segment')

  const toggle = (key: keyof FilterConfig, value: string) => {
    const cur = (config[key] as string[]) || []
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
    onChange({ ...config, [key]: next.length > 0 ? next : undefined })
  }

  const updateDateCondition = (key: keyof DateCondition, value: number | undefined) => {
    const newDateCondition = { ...config.dateCondition, [key]: value }
    const hasValue = Object.values(newDateCondition).some(v => v !== undefined)
    onChange({ ...config, dateCondition: hasValue ? newDateCondition : undefined })
  }

  return (
    <div className="node-card node-filter">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="node-header node-header-filter">🎯 대상 (누구에게)</div>
      <div className="node-body">
        {/* 모드 선택 */}
        <div className="node-field">
          <span className="node-label">조건 유형</span>
          <div className="flex gap-1.5">
            <button type="button"
              onClick={() => setMode('segment')}
              className={`node-chip ${mode === 'segment' ? 'node-chip-active' : ''}`}
            >세그먼트</button>
            <button type="button"
              onClick={() => setMode('date')}
              className={`node-chip ${mode === 'date' ? 'node-chip-active' : ''}`}
            >날짜 기준</button>
          </div>
        </div>

        {mode === 'segment' && (
          <>
            <div className="node-field">
              <span className="node-label">방문 세그먼트</span>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(VISIT_SEGMENT_LABELS).map(([k, l]) => (
                  <button key={k} type="button"
                    onClick={() => toggle('visitSegments', k)}
                    className={`node-chip ${config.visitSegments?.includes(k) ? 'node-chip-active' : ''}`}
                  >{l}</button>
                ))}
              </div>
            </div>

            <div className="node-field">
              <span className="node-label">이용권</span>
              <div className="flex gap-1 flex-wrap">
                {Object.entries(TICKET_SEGMENT_LABELS).map(([k, l]) => (
                  <button key={k} type="button"
                    onClick={() => toggle('ticketSegments', k)}
                    className={`node-chip ${config.ticketSegments?.includes(k) ? 'node-chip-active' : ''}`}
                  >{l}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'date' && (
          <>
            <div className="node-field">
              <span className="node-label">첫 방문 후</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">+</span>
                <input type="number" min={0}
                  value={config.dateCondition?.daysAfterFirstVisit || ''}
                  onChange={e => updateDateCondition('daysAfterFirstVisit', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="N"
                  className="node-input w-16"
                />
                <span className="text-xs text-gray-400">일</span>
              </div>
            </div>

            <div className="node-field">
              <span className="node-label">마지막 방문 후</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">+</span>
                <input type="number" min={0}
                  value={config.dateCondition?.daysAfterLastVisit || ''}
                  onChange={e => updateDateCondition('daysAfterLastVisit', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="N"
                  className="node-input w-16"
                />
                <span className="text-xs text-gray-400">일</span>
              </div>
            </div>

            <div className="node-field">
              <span className="node-label">이번달 방문 횟수</span>
              <div className="flex items-center gap-1">
                <input type="number" min={0}
                  value={config.dateCondition?.minMonthlyVisits || ''}
                  onChange={e => updateDateCondition('minMonthlyVisits', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="최소"
                  className="node-input w-14"
                />
                <span className="text-xs text-gray-400">~</span>
                <input type="number" min={0}
                  value={config.dateCondition?.maxMonthlyVisits || ''}
                  onChange={e => updateDateCondition('maxMonthlyVisits', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="최대"
                  className="node-input w-14"
                />
                <span className="text-xs text-gray-400">회</span>
              </div>
            </div>
          </>
        )}

        {/* 공통 조건 */}
        <div className="node-field">
          <span className="node-label">미방문 기간</span>
          <div className="flex items-center gap-1">
            <input type="number" min={0}
              value={config.inactiveDays || ''}
              onChange={e => onChange({ ...config, inactiveDays: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="N"
              className="node-input w-16"
            />
            <span className="text-xs text-gray-400">일 이상</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const FilterNode = memo(FilterNodeInner)
