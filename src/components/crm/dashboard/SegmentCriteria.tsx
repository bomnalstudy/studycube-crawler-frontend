'use client'

import { useState } from 'react'
import {
  VisitSegment, TicketSegment,
  VISIT_SEGMENT_LABELS, VISIT_SEGMENT_COLORS, VISIT_SEGMENT_DESCRIPTIONS,
  TICKET_SEGMENT_LABELS, TICKET_SEGMENT_COLORS, TICKET_SEGMENT_DESCRIPTIONS,
} from '@/types/crm'

const VISIT_SEGMENTS: VisitSegment[] = [
  'churned', 'at_risk_7', 'new_0_7', 'visit_under10', 'visit_10_20', 'visit_over20',
]

const TICKET_SEGMENTS: TicketSegment[] = ['day_ticket', 'time_ticket', 'term_ticket', 'fixed_ticket']

export function SegmentCriteria() {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">세그먼트 분류 기준</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 mt-3 mb-3">
            고객은 방문 세그먼트와 이용권 세그먼트 각각 하나씩 부여됩니다
          </p>

          {/* 방문 세그먼트 */}
          <p className="text-xs font-semibold text-gray-600 mb-2">방문 세그먼트</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {VISIT_SEGMENTS.map((seg) => (
              <div
                key={seg}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: VISIT_SEGMENT_COLORS[seg] }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{VISIT_SEGMENT_LABELS[seg]}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{VISIT_SEGMENT_DESCRIPTIONS[seg]}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 이용권 세그먼트 */}
          <p className="text-xs font-semibold text-gray-600 mb-2">이용권 세그먼트</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {TICKET_SEGMENTS.map((seg) => (
              <div
                key={seg}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: TICKET_SEGMENT_COLORS[seg] }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{TICKET_SEGMENT_LABELS[seg]}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{TICKET_SEGMENT_DESCRIPTIONS[seg]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
