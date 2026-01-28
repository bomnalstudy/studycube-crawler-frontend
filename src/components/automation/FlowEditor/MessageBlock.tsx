'use client'

import { useState, useEffect } from 'react'
import { calculateByteCount, getMessageType } from '../utils/formatters'
import './FlowEditor.css'

interface MessageBlockProps {
  template: string
  onChange: (template: string) => void
}

const VARIABLES = [
  { key: '{이름}', label: '이름' },
  { key: '{마지막방문일}', label: '마지막 방문일' },
  { key: '{방문횟수}', label: '방문 횟수' },
  { key: '{지점명}', label: '지점명' },
]

export function MessageBlock({ template, onChange }: MessageBlockProps) {
  const [byteCount, setByteCount] = useState(0)
  const [msgType, setMsgType] = useState<'SMS' | 'LMS'>('SMS')

  useEffect(() => {
    const bytes = calculateByteCount(template)
    setByteCount(bytes)
    setMsgType(getMessageType(template))
  }, [template])

  const insertVariable = (variable: string) => {
    onChange(template + variable)
  }

  return (
    <div className="editor-block editor-block-message">
      <div className="editor-block-header">
        <span className="editor-block-icon">💬</span>
        <span className="editor-block-title">메시지 (문자 내용)</span>
      </div>
      <div className="editor-block-body">
        {/* 변수 삽입 */}
        <div className="editor-field">
          <label className="editor-label">변수 삽입</label>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="editor-chip"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* 메시지 입력 */}
        <div className="editor-field">
          <label className="editor-label">문자 내용</label>
          <textarea
            value={template}
            onChange={e => onChange(e.target.value)}
            rows={5}
            placeholder="문자 내용을 입력하세요..."
            className="editor-input w-full resize-none"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs font-medium ${msgType === 'LMS' ? 'text-orange-500' : 'text-green-500'}`}>
              {msgType} ({byteCount}byte)
            </span>
            <span className="text-xs text-gray-400">
              SMS: 90byte / LMS: 2,000byte
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
