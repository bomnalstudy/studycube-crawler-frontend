'use client'

import { memo, useState, DragEvent } from 'react'
import './BlockPalette.css'

// 블록 타입 정의
export type BlockCategory = 'trigger' | 'dateRange' | 'segment' | 'condition' | 'action'

export interface BlockDefinition {
  id: string
  category: BlockCategory
  label: string
  icon: string
  nodeType: string
  nodeData: Record<string, unknown>
  // 세그먼트 프리셋: 드래그 시 생성할 조건 블록들
  presetBlocks?: BlockDefinition[]
}

// ===== 트리거 블록 =====
const TRIGGER_BLOCKS: BlockDefinition[] = [
  { id: 'trigger-recurring', category: 'trigger', label: '반복 실행', icon: '🔄', nodeType: 'trigger', nodeData: { triggerType: 'recurring' } },
  { id: 'trigger-scheduled', category: 'trigger', label: '예약 실행', icon: '📅', nodeType: 'trigger', nodeData: { triggerType: 'scheduled' } },
  { id: 'trigger-manual', category: 'trigger', label: '수동 실행', icon: '👆', nodeType: 'trigger', nodeData: { triggerType: 'manual' } },
]

// ===== 날짜 범위 블록 =====
const DATE_RANGE_BLOCKS: BlockDefinition[] = [
  { id: 'date-this_month', category: 'dateRange', label: '이번달', icon: '📅', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_month' } },
  { id: 'date-this_week', category: 'dateRange', label: '이번주', icon: '📆', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_week' } },
  { id: 'date-yesterday', category: 'dateRange', label: '어제', icon: '⬅️', nodeType: 'dateRange', nodeData: { dateRangeType: 'yesterday' } },
  { id: 'date-total', category: 'dateRange', label: '총', icon: '📊', nodeType: 'dateRange', nodeData: { dateRangeType: 'total' } },
  { id: 'date-days_ago', category: 'dateRange', label: 'N일 전', icon: '🔢', nodeType: 'dateRange', nodeData: { dateRangeType: 'days_ago', daysAgo: 7 } },
]

// ===== 조건 블록 =====
const CONDITION_BLOCKS: BlockDefinition[] = [
  { id: 'cond-visit_count', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'gte', value: 1 } },
  { id: 'cond-days_after_first', category: 'condition', label: '첫방문 이후', icon: '🆕', nodeType: 'condition', nodeData: { conditionType: 'days_after_first', operator: 'gte', value: 7 } },
  { id: 'cond-days_after_last', category: 'condition', label: '마지막방문 이후', icon: '📍', nodeType: 'condition', nodeData: { conditionType: 'days_after_last', operator: 'gte', value: 14 } },
  { id: 'cond-remaining_time', category: 'condition', label: '잔여 시간권', icon: '⏱️', nodeType: 'condition', nodeData: { conditionType: 'remaining_time', operator: 'lte', value: 10 } },
  { id: 'cond-remaining_term', category: 'condition', label: '잔여 기간권', icon: '📅', nodeType: 'condition', nodeData: { conditionType: 'remaining_term', operator: 'lte', value: 7 } },
  { id: 'cond-remaining_fixed', category: 'condition', label: '잔여 고정석', icon: '🪑', nodeType: 'condition', nodeData: { conditionType: 'remaining_fixed', operator: 'lte', value: 7 } },
  { id: 'cond-total_spent', category: 'condition', label: '사용 금액', icon: '💰', nodeType: 'condition', nodeData: { conditionType: 'total_spent', operator: 'gte', value: 100000 } },
  { id: 'cond-inactive_days', category: 'condition', label: '미방문 기간', icon: '😴', nodeType: 'condition', nodeData: { conditionType: 'inactive_days', operator: 'gte', value: 14 } },
]

// ===== 세그먼트 블록 (프리셋) =====
const SEGMENT_BLOCKS: BlockDefinition[] = [
  {
    id: 'segment-churned', category: 'segment', label: '이탈', icon: '💤', nodeType: 'segment', nodeData: { segment: 'churned' },
    presetBlocks: [
      { id: 'preset', category: 'condition', label: '미방문 기간', icon: '😴', nodeType: 'condition', nodeData: { conditionType: 'inactive_days', operator: 'gte', value: 30 } },
    ]
  },
  {
    id: 'segment-at_risk', category: 'segment', label: '이탈위험', icon: '⚠️', nodeType: 'segment', nodeData: { segment: 'at_risk_14' },
    presetBlocks: [
      { id: 'preset1', category: 'condition', label: '마지막방문 이후', icon: '📍', nodeType: 'condition', nodeData: { conditionType: 'days_after_last', operator: 'gte', value: 14 } },
      { id: 'preset2', category: 'condition', label: '마지막방문 이후', icon: '📍', nodeType: 'condition', nodeData: { conditionType: 'days_after_last', operator: 'lte', value: 30 } },
    ]
  },
  {
    id: 'segment-returned', category: 'segment', label: '복귀', icon: '🔙', nodeType: 'segment', nodeData: { segment: 'returned' },
    presetBlocks: [
      { id: 'preset', category: 'dateRange', label: '이번주', icon: '📆', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_week' } },
      { id: 'preset2', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'gte', value: 1 } },
    ]
  },
  {
    id: 'segment-new', category: 'segment', label: '신규', icon: '🆕', nodeType: 'segment', nodeData: { segment: 'new_0_7' },
    presetBlocks: [
      { id: 'preset', category: 'condition', label: '첫방문 이후', icon: '🆕', nodeType: 'condition', nodeData: { conditionType: 'days_after_first', operator: 'lte', value: 7 } },
    ]
  },
  {
    id: 'segment-normal', category: 'segment', label: '일반', icon: '👤', nodeType: 'segment', nodeData: { segment: 'visit_under10' },
    presetBlocks: [
      { id: 'preset', category: 'dateRange', label: '이번달', icon: '📅', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_month' } },
      { id: 'preset2', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'lte', value: 10 } },
    ]
  },
  {
    id: 'segment-regular', category: 'segment', label: '단골', icon: '⭐', nodeType: 'segment', nodeData: { segment: 'visit_10_20' },
    presetBlocks: [
      { id: 'preset', category: 'dateRange', label: '이번달', icon: '📅', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_month' } },
      { id: 'preset2', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'gte', value: 10 } },
      { id: 'preset3', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'lte', value: 20 } },
    ]
  },
  {
    id: 'segment-vip', category: 'segment', label: 'VIP', icon: '👑', nodeType: 'segment', nodeData: { segment: 'visit_over20' },
    presetBlocks: [
      { id: 'preset', category: 'dateRange', label: '이번달', icon: '📅', nodeType: 'dateRange', nodeData: { dateRangeType: 'this_month' } },
      { id: 'preset2', category: 'condition', label: '방문 횟수', icon: '🚶', nodeType: 'condition', nodeData: { conditionType: 'visit_count', operator: 'gte', value: 20 } },
    ]
  },
]

// ===== 액션 블록 =====
const ACTION_BLOCKS: BlockDefinition[] = [
  { id: 'action-sms', category: 'action', label: '문자 발송', icon: '💬', nodeType: 'message', nodeData: { template: '' } },
  { id: 'action-point', category: 'action', label: '포인트 지급', icon: '🎁', nodeType: 'point', nodeData: { action: 'GRANT', amount: 1000 } },
]

const ALL_BLOCKS = [...TRIGGER_BLOCKS, ...DATE_RANGE_BLOCKS, ...SEGMENT_BLOCKS, ...CONDITION_BLOCKS, ...ACTION_BLOCKS]

const TABS: { key: BlockCategory; label: string; color: string }[] = [
  { key: 'trigger', label: '트리거', color: '#F97316' },
  { key: 'dateRange', label: '날짜', color: '#0EA5E9' },
  { key: 'segment', label: '세그먼트', color: '#6B7280' },
  { key: 'condition', label: '조건', color: '#8B5CF6' },
  { key: 'action', label: '액션', color: '#22C55E' },
]

function DraggableBlock({ block }: { block: BlockDefinition }) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify(block))
    e.dataTransfer.effectAllowed = 'move'
  }

  const isPreset = block.category === 'segment' && block.presetBlocks

  return (
    <div
      className={`palette-block palette-block-${block.category}`}
      draggable
      onDragStart={handleDragStart}
      title={isPreset ? '드래그하면 조건 블록으로 변환됩니다' : undefined}
    >
      <span className="palette-block-icon">{block.icon}</span>
      <span className="palette-block-label">{block.label}</span>
      {isPreset && <span className="palette-block-preset-badge">프리셋</span>}
    </div>
  )
}

function BlockPaletteInner() {
  const [activeTab, setActiveTab] = useState<BlockCategory>('trigger')

  const filteredBlocks = ALL_BLOCKS.filter(b => b.category === activeTab)
  const activeTabInfo = TABS.find(t => t.key === activeTab)

  return (
    <div className="block-palette">
      <div className="block-palette-header">
        <h3 className="block-palette-title">블록 팔레트</h3>
        <p className="block-palette-hint">드래그하여 캔버스에 추가</p>
      </div>

      <div className="block-palette-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`block-palette-tab ${activeTab === tab.key ? 'active' : ''}`}
            style={{ '--tab-color': tab.color } as React.CSSProperties}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="block-palette-content"
        style={{ '--category-color': activeTabInfo?.color } as React.CSSProperties}
      >
        <div className="palette-blocks-grid">
          {filteredBlocks.map(block => (
            <DraggableBlock key={block.id} block={block} />
          ))}
        </div>
      </div>

      <div className="block-palette-footer">
        <div className="block-palette-guide">
          <p className="guide-title">연결 예시</p>
          <div className="guide-example">
            <span className="guide-block">🪑 잔여고정석</span>
            <span className="guide-arrow">→</span>
            <span className="guide-block">≤5일</span>
            <span className="guide-arrow">→</span>
            <span className="guide-block">💬 문자</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const BlockPalette = memo(BlockPaletteInner)
export type { BlockDefinition }
