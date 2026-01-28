'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth, endOfMonth, subMonths, addMonths, format,
  subDays,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { CustomerVisitItem } from '@/types/crm'
import './CustomerTimeline.css'

interface CustomerTimelineProps {
  visits: CustomerVisitItem[]
}

interface TimelineBar {
  visit: CustomerVisitItem
  startHour: number
  endHour: number
}

type QuickFilter = 'all' | 'yesterday' | 'week' | null

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const BAR_COLORS = [
  '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
]

export function CustomerTimeline({ visits }: CustomerTimelineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<string | null>(null)
  const [baseMonth, setBaseMonth] = useState<Date>(new Date())
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null)

  // 현재 월 범위
  const monthStart = format(startOfMonth(baseMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(baseMonth), 'yyyy-MM-dd')
  const monthLabel = format(baseMonth, 'yyyy년 M월', { locale: ko })

  // 필터링
  const filteredVisits = useMemo(() => {
    if (quickFilter === 'all') return visits

    if (quickFilter === 'yesterday') {
      const yesterday = subDays(new Date(), 1)
      const str = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
      return visits.filter(v => v.visitDate === str)
    }
    if (quickFilter === 'week') {
      const now = new Date()
      const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
      const weekAgo = subDays(now, 7).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
      return visits.filter(v => v.visitDate >= weekAgo && v.visitDate <= today)
    }

    // 기본: 월 범위
    return visits.filter(v => v.visitDate >= monthStart && v.visitDate <= monthEnd)
  }, [visits, quickFilter, monthStart, monthEnd])

  // 날짜별 그룹핑
  const dateGroups = useMemo(() => {
    const map = new Map<string, CustomerVisitItem[]>()
    filteredVisits.forEach(v => {
      if (!map.has(v.visitDate)) map.set(v.visitDate, [])
      map.get(v.visitDate)!.push(v)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredVisits])

  const handlePrevMonth = () => {
    setBaseMonth(prev => subMonths(prev, 1))
    setQuickFilter(null)
  }
  const handleNextMonth = () => {
    setBaseMonth(prev => addMonths(prev, 1))
    setQuickFilter(null)
  }
  const handleQuick = (key: QuickFilter) => {
    setQuickFilter(key)
  }
  const handleMonthReset = () => {
    setQuickFilter(null)
    setBaseMonth(new Date())
  }

  const isMonthMode = quickFilter === null

  return (
    <div className="space-y-3">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={handleMonthReset}
          className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${
            isMonthMode ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {monthLabel}
        </button>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 빠른 필터 */}
      <div className="flex items-center gap-1.5">
        {([
          { key: null as QuickFilter, label: '이번 달' },
          { key: 'all' as QuickFilter, label: '전체' },
          { key: 'yesterday' as QuickFilter, label: '어제' },
          { key: 'week' as QuickFilter, label: '일주일' },
        ]).map(f => (
          <button
            key={String(f.key)}
            onClick={() => {
              if (f.key === null) handleMonthReset()
              else handleQuick(f.key)
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              quickFilter === f.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 결과 카운트 */}
      <p className="text-[11px] text-gray-400">
        {dateGroups.length}일 / {filteredVisits.length}건
      </p>

      {/* 타임라인 */}
      {filteredVisits.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-gray-400">해당 기간에 이용 내역이 없습니다</p>
        </div>
      ) : (
        dateGroups.map(([date, dayVisits]) => {
          const bars: TimelineBar[] = dayVisits.map(v => {
            const startHour = parseVisitTime(v.visitTime) ?? 9
            const duration = v.duration ?? 60
            const endHour = Math.min(startHour + duration / 60, 24)
            return { visit: v, startHour, endHour }
          })

          return (
            <div key={date} className="ct-day-block">
              <div className="ct-date-label">
                <span className="text-[11px] font-semibold text-gray-700">{formatDateLabel(date)}</span>
                <span className="text-[10px] text-gray-400 ml-1">{dayVisits.length}건</span>
              </div>

              <div className="ct-hour-header">
                <div className="ct-row-label" />
                {HOURS.map(h => (
                  <div key={h} className="ct-hour-tick">
                    {h % 3 === 0 && (
                      <span className="text-[8px] text-gray-300">{h}</span>
                    )}
                  </div>
                ))}
              </div>

              {bars.map((bar, idx) => {
                const leftPct = (bar.startHour / 24) * 100
                const widthPct = ((bar.endHour - bar.startHour) / 24) * 100
                const color = BAR_COLORS[idx % BAR_COLORS.length]
                const key = `${date}-${idx}`
                const isHovered = hoveredIdx === key

                return (
                  <div key={key} className="ct-row">
                    <div className="ct-row-label">
                      <span className="text-[10px] text-gray-500 truncate">
                        {bar.visit.seat || bar.visit.visitTime || '-'}
                      </span>
                    </div>
                    <div className="ct-timeline-area">
                      {HOURS.map(h => (
                        <div
                          key={h}
                          className="ct-gridline"
                          style={{ left: `${(h / 24) * 100}%` }}
                        />
                      ))}
                      <div
                        className="ct-bar"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 1.5)}%`,
                          backgroundColor: color,
                          opacity: isHovered ? 1 : 0.75,
                          transform: isHovered ? 'scaleY(1.4)' : 'scaleY(1)',
                        }}
                        onMouseEnter={() => setHoveredIdx(key)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                      {isHovered && (
                        <div
                          className="ct-tooltip"
                          style={{ left: `${leftPct + widthPct / 2}%` }}
                        >
                          <p>{bar.visit.visitTime || '-'} 입실</p>
                          {bar.visit.duration && <p>{formatDuration(bar.visit.duration)}</p>}
                          {bar.visit.seat && <p>좌석: {bar.visit.seat}</p>}
                          <p className="text-gray-400">{bar.visit.branchName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}

function parseVisitTime(time: string | null): number | null {
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00+09:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const month = d.getMonth() + 1
  const day = d.getDate()
  const dow = days[d.getDay()]
  return `${month}/${day} (${dow})`
}
