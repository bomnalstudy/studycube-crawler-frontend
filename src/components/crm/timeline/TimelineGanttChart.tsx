'use client'

import { useState } from 'react'
import { TimelineHourData, TimelineVisitor } from '@/types/crm'
import { maskPhone } from '@/lib/crm/phone-masker'
import './TimelineGanttChart.css'

interface TimelineGanttChartProps {
  hours: TimelineHourData[]
  onCustomerClick?: (customerId: string) => void
}

interface GanttBar {
  visitor: TimelineVisitor
  startHour: number    // 소수점 포함 (e.g. 9.5 = 9:30)
  endHour: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const BAR_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
]

export function TimelineGanttChart({ hours, onCustomerClick }: TimelineGanttChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  // 방문자 데이터를 간트 바로 변환
  const bars: GanttBar[] = []
  hours.forEach(h => {
    h.visitors.forEach(v => {
      // 이미 같은 전화번호가 있으면 중복 방지
      if (bars.some(b => b.visitor.phone === v.phone)) return

      const startHour = parseTimeToHour(v.startTime) ?? h.hour
      const duration = v.duration ?? 60 // 기본 1시간
      const endHour = Math.min(startHour + duration / 60, 24)

      bars.push({ visitor: v, startHour, endHour })
    })
  })

  // 시작시간 순 정렬
  bars.sort((a, b) => a.startHour - b.startHour)

  // 시간대별 이용자 수 요약 (상단 헤더)
  const hourCounts = new Map<number, number>()
  hours.forEach(h => {
    if (h.usageCount > 0) hourCounts.set(h.hour, h.usageCount)
  })

  if (bars.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">이용자 타임라인</h3>
        <p className="text-sm text-gray-400 text-center py-10">해당 날짜에 방문자 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">이용자 타임라인</h3>
        <span className="text-xs text-gray-400 font-medium">{bars.length}명</span>
      </div>

      <div className="gantt-container">
        <div className="gantt-grid">
          {/* 시간 헤더 */}
          <div className="gantt-header">
            <div className="gantt-label-cell" />
            {HOURS.map(h => (
              <div key={h} className="gantt-hour-cell">
                <span className="text-[9px] text-gray-400 font-medium">{h}</span>
                {hourCounts.has(h) && (
                  <span className="text-[8px] text-blue-500 font-bold">
                    {hourCounts.get(h)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 간트 바 행 */}
          {bars.map((bar, idx) => {
            const leftPercent = (bar.startHour / 24) * 100
            const widthPercent = ((bar.endHour - bar.startHour) / 24) * 100
            const color = BAR_COLORS[idx % BAR_COLORS.length]
            const isHovered = hoveredBar === idx
            const hasCustomer = !!bar.visitor.customerId

            return (
              <div key={idx} className="gantt-row">
                {/* 전화번호 라벨 */}
                <div
                  className={`gantt-label-cell ${hasCustomer ? 'cursor-pointer hover:text-blue-600' : ''}`}
                  onClick={() => {
                    if (hasCustomer) onCustomerClick?.(bar.visitor.customerId!)
                  }}
                >
                  <span className={`text-[11px] font-medium truncate ${hasCustomer ? 'text-blue-600' : 'text-gray-600'}`}>
                    {maskPhone(bar.visitor.phone)}
                  </span>
                </div>

                {/* 타임라인 영역 */}
                <div className="gantt-timeline-area">
                  {/* 시간 구분선 */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="gantt-gridline"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}

                  {/* 바 */}
                  <div
                    className={`gantt-bar ${hasCustomer ? 'cursor-pointer' : ''}`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 0.8)}%`,
                      backgroundColor: color,
                      opacity: isHovered ? 1 : 0.8,
                      transform: isHovered ? 'scaleY(1.3)' : 'scaleY(1)',
                    }}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => {
                      if (hasCustomer) onCustomerClick?.(bar.visitor.customerId!)
                    }}
                  >
                    {/* 바 안 텍스트 (충분히 넓을 때만) */}
                    {widthPercent > 4 && (
                      <span className="gantt-bar-label">
                        {bar.visitor.seat || ''}
                      </span>
                    )}
                  </div>

                  {/* 호버 툴팁 */}
                  {isHovered && (
                    <div
                      className="gantt-tooltip"
                      style={{
                        left: `${leftPercent + widthPercent / 2}%`,
                      }}
                    >
                      <p className="font-semibold">{maskPhone(bar.visitor.phone)}</p>
                      {bar.visitor.seat && <p>좌석: {bar.visitor.seat}</p>}
                      <p>입실: {bar.visitor.startTime || '-'}</p>
                      <p>이용: {bar.visitor.duration ? formatDuration(bar.visitor.duration) : '-'}</p>
                      {bar.visitor.ageGroup && <p>연령: {bar.visitor.ageGroup}</p>}
                      {bar.visitor.gender && <p>성별: {bar.visitor.gender === 'M' ? '남' : bar.visitor.gender === 'F' ? '여' : bar.visitor.gender}</p>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** "HH:mm" 문자열을 소수점 시간으로 변환 (e.g. "09:30" → 9.5) */
function parseTimeToHour(time: string | null): number | null {
  if (!time) return null
  const parts = time.split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h + m / 60
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}
