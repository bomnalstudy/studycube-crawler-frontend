'use client'

import { memo } from 'react'
import { PointConfig, PointAction } from '@/types/automation'

interface ActionSectionProps {
  enableSms: boolean
  onEnableSmsChange: (enabled: boolean) => void
  messageTemplate: string
  onMessageChange: (template: string) => void
  enablePoint: boolean
  onEnablePointChange: (enabled: boolean) => void
  pointConfig: PointConfig
  onPointChange: (config: PointConfig) => void
}

const MESSAGE_VARIABLES = [
  { key: '{이름}', label: '이름' },
  { key: '{지점명}', label: '지점명' },
  { key: '{마지막방문일}', label: '마지막방문' },
  { key: '{방문횟수}', label: '방문횟수' },
  { key: '{잔여기간권}', label: '잔여기간권' },
  { key: '{잔여시간}', label: '잔여시간' },
  { key: '{잔여고정석}', label: '잔여고정석' },
]

function ActionSectionInner({
  enableSms,
  onEnableSmsChange,
  messageTemplate,
  onMessageChange,
  enablePoint,
  onEnablePointChange,
  pointConfig,
  onPointChange,
}: ActionSectionProps) {
  const insertVariable = (key: string) => {
    onMessageChange(messageTemplate + key)
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <span className="form-section-number">3</span>
        <span className="form-section-title">무엇을</span>
      </div>

      <div className="form-section-content">
        {/* 문자 발송 */}
        <div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={enableSms}
              onChange={e => onEnableSmsChange(e.target.checked)}
            />
            <span>문자 발송</span>
          </label>

          <div className={enableSms ? '' : 'form-disabled'} style={{ marginTop: '10px' }}>
            <textarea
              value={messageTemplate}
              onChange={e => onMessageChange(e.target.value)}
              placeholder="문자 내용을 입력하세요..."
              className="message-textarea"
              disabled={!enableSms}
            />
            <div className="message-variables">
              {MESSAGE_VARIABLES.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="variable-chip"
                  disabled={!enableSms}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 포인트 지급 */}
        <div style={{ marginTop: '16px' }}>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={enablePoint}
              onChange={e => onEnablePointChange(e.target.checked)}
            />
            <span>포인트 지급</span>
          </label>

          <div className={enablePoint ? '' : 'form-disabled'} style={{ marginTop: '10px' }}>
            <div className="point-input-row">
              <input
                type="number"
                min={0}
                step={100}
                value={pointConfig.amount}
                onChange={e => onPointChange({ ...pointConfig, amount: Number(e.target.value) })}
                className="point-input"
                disabled={!enablePoint}
              />
              <span className="point-unit">P</span>

              <div className="point-action-radios">
                <label className="form-radio">
                  <input
                    type="radio"
                    name="pointAction"
                    checked={pointConfig.action === 'GRANT'}
                    onChange={() => onPointChange({ ...pointConfig, action: 'GRANT' })}
                    disabled={!enablePoint}
                  />
                  <span>지급</span>
                </label>
                <label className="form-radio">
                  <input
                    type="radio"
                    name="pointAction"
                    checked={pointConfig.action === 'DEDUCT'}
                    onChange={() => onPointChange({ ...pointConfig, action: 'DEDUCT' })}
                    disabled={!enablePoint}
                  />
                  <span>차감</span>
                </label>
              </div>
            </div>

            {/* 포인트 부여 설명 */}
            <div style={{ marginTop: '12px' }}>
              <input
                type="text"
                value={pointConfig.reason}
                onChange={e => onPointChange({ ...pointConfig, reason: e.target.value })}
                placeholder="포인트 부여 설명 (선택)"
                className="point-reason-input"
                disabled={!enablePoint}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ActionSection = memo(ActionSectionInner)
