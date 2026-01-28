'use client'

import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { calculateByteCount, getMessageType } from '../../utils/formatters'

const VARIABLES = [
  { key: '{이름}', label: '이름' },
  { key: '{마지막방문일}', label: '마지막 방문일' },
  { key: '{방문횟수}', label: '방문 횟수' },
  { key: '{지점명}', label: '지점명' },
]

function MessageNodeInner({ data }: NodeProps) {
  const template = (data.template as string) || ''
  const onChange = data.onChange as (template: string) => void

  const byteCount = useMemo(() => calculateByteCount(template), [template])
  const msgType = useMemo(() => getMessageType(template), [template])

  return (
    <div className="node-card node-message">
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="node-header node-header-message">💬 메시지 (문자 내용)</div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">변수 삽입</span>
          <div className="flex gap-1 flex-wrap">
            {VARIABLES.map(v => (
              <button key={v.key} type="button"
                onClick={() => onChange(template + v.key)}
                className="node-chip"
              >{v.label}</button>
            ))}
          </div>
        </div>

        <div className="node-field">
          <span className="node-label">내용</span>
          <textarea
            value={template}
            onChange={e => onChange(e.target.value)}
            rows={4}
            placeholder="문자 내용을 입력하세요..."
            className="node-input w-full resize-none"
          />
          <div className="flex justify-between mt-1">
            <span className={`text-[10px] font-medium ${msgType === 'LMS' ? 'text-orange-500' : 'text-green-500'}`}>
              {msgType} ({byteCount}byte)
            </span>
            <span className="text-[10px] text-gray-400">SMS 90 / LMS 2,000byte</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}

export const MessageNode = memo(MessageNodeInner)
