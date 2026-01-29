'use client'

import { memo } from 'react'
import { TriggerSection } from './TriggerSection'
import { TargetSection } from './TargetSection'
import { ActionSection } from './ActionSection'
import { TriggerConfig, FilterConfig, PointConfig } from '@/types/automation'
import './AutomationForm.css'

interface AutomationFormProps {
  // 트리거
  triggerConfig: TriggerConfig
  onTriggerChange: (config: TriggerConfig) => void
  // 대상 (필터)
  filterConfig: FilterConfig
  onFilterChange: (config: FilterConfig) => void
  // 액션
  enableSms: boolean
  onEnableSmsChange: (enabled: boolean) => void
  messageTemplate: string
  onMessageChange: (template: string) => void
  enablePoint: boolean
  onEnablePointChange: (enabled: boolean) => void
  pointConfig: PointConfig
  onPointChange: (config: PointConfig) => void
}

function AutomationFormInner({
  triggerConfig,
  onTriggerChange,
  filterConfig,
  onFilterChange,
  enableSms,
  onEnableSmsChange,
  messageTemplate,
  onMessageChange,
  enablePoint,
  onEnablePointChange,
  pointConfig,
  onPointChange,
}: AutomationFormProps) {
  return (
    <div className="automation-form">
      <div className="automation-form-columns">
        {/* 1. 언제 */}
        <TriggerSection config={triggerConfig} onChange={onTriggerChange} />

        {/* 2. 누구에게 */}
        <TargetSection config={filterConfig} onChange={onFilterChange} />

        {/* 3. 무엇을 */}
        <ActionSection
          enableSms={enableSms}
          onEnableSmsChange={onEnableSmsChange}
          messageTemplate={messageTemplate}
          onMessageChange={onMessageChange}
          enablePoint={enablePoint}
          onEnablePointChange={onEnablePointChange}
          pointConfig={pointConfig}
          onPointChange={onPointChange}
        />
      </div>
    </div>
  )
}

export const AutomationForm = memo(AutomationFormInner)
