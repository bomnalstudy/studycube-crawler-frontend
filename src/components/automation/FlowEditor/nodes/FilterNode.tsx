'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FilterConfig } from '@/types/automation'
import { VISIT_SEGMENT_LABELS, TICKET_SEGMENT_LABELS } from '@/types/crm'

const AGE_GROUPS = ['10대', '20대', '30대', '40대', '50대', '60대 이상']

function FilterNodeInner({ data }: NodeProps) {
  const config = data.config as FilterConfig
  const onChange = data.onChange as (config: FilterConfig) => void

  const toggle = (key: keyof FilterConfig, value: string) => {
    const cur = (config[key] as string[]) || []
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
    onChange({ ...config, [key]: next.length > 0 ? next : undefined })
  }

  return (
    <div className="node-card node-filter">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="node-header node-header-filter">🎯 대상 (누구에게)</div>
      <div className="node-body">
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

        <div className="node-field">
          <span className="node-label">연령대</span>
          <div className="flex gap-1 flex-wrap">
            {AGE_GROUPS.map(a => (
              <button key={a} type="button"
                onClick={() => toggle('ageGroups', a)}
                className={`node-chip ${config.ageGroups?.includes(a) ? 'node-chip-active' : ''}`}
              >{a}</button>
            ))}
          </div>
        </div>

        <div className="node-field">
          <span className="node-label">미방문 기간 (일 이상)</span>
          <input type="number" min={0}
            value={config.inactiveDays || ''}
            onChange={e => onChange({ ...config, inactiveDays: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="예: 14"
            className="node-input w-24"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const FilterNode = memo(FilterNodeInner)
