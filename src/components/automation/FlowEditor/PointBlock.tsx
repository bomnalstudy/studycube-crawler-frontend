'use client'

import { PointConfig, PointAction } from '@/types/automation'
import './FlowEditor.css'

interface PointBlockProps {
  config: PointConfig
  onChange: (config: PointConfig) => void
}

export function PointBlock({ config, onChange }: PointBlockProps) {
  return (
    <div className="editor-block editor-block-point">
      <div className="editor-block-header">
        <span className="editor-block-icon">🎁</span>
        <span className="editor-block-title">포인트 (지급/차감)</span>
      </div>
      <div className="editor-block-body">
        {/* 지급/차감 선택 */}
        <div className="editor-field">
          <label className="editor-label">액션</label>
          <div className="flex gap-2">
            {(['GRANT', 'DEDUCT'] as PointAction[]).map(action => (
              <button
                key={action}
                type="button"
                onClick={() => onChange({ ...config, action })}
                className={`editor-chip ${config.action === action ? 'editor-chip-active' : ''}`}
              >
                {action === 'GRANT' ? '포인트 지급' : '포인트 차감'}
              </button>
            ))}
          </div>
        </div>

        {/* 금액 */}
        <div className="editor-field">
          <label className="editor-label">포인트 금액</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={100}
              value={config.amount}
              onChange={e => onChange({ ...config, amount: Number(e.target.value) })}
              className="editor-input w-32"
            />
            <span className="text-sm text-gray-500">P</span>
          </div>
        </div>

        {/* 사유 */}
        <div className="editor-field">
          <label className="editor-label">{config.action === 'GRANT' ? '지급' : '차감'} 사유</label>
          <input
            type="text"
            value={config.reason}
            onChange={e => onChange({ ...config, reason: e.target.value })}
            placeholder="예: 이탈위험 복귀 보너스"
            className="editor-input w-full"
          />
        </div>

        {/* 유효기간 (지급 시에만) */}
        {config.action === 'GRANT' && (
          <div className="editor-field">
            <label className="editor-label">유효기간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={config.expiryDays}
                onChange={e => onChange({ ...config, expiryDays: Number(e.target.value) })}
                className="editor-input w-20"
              />
              <span className="text-sm text-gray-500">일</span>
            </div>
          </div>
        )}

        {/* 중복 지급 방지 */}
        <div className="editor-field">
          <label className="editor-label">중복 방지 기간</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={config.deduplicateDays ?? ''}
              onChange={e => onChange({
                ...config,
                deduplicateDays: e.target.value ? Number(e.target.value) : null,
              })}
              placeholder="미설정"
              className="editor-input w-20"
            />
            <span className="text-sm text-gray-500">일 (빈칸: 미적용)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
