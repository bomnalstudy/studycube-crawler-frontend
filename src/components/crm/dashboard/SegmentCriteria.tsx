'use client'

import { useState } from 'react'
import { SEGMENT_LABELS, SEGMENT_COLORS, SEGMENT_DESCRIPTIONS, CustomerSegment } from '@/types/crm'

const SEGMENTS: CustomerSegment[] = [
  'claim', 'at_risk_7', 'new_0_7', 'day_ticket',
  'term_ticket', 'visit_over20', 'visit_10_20', 'visit_under10',
]

export function SegmentCriteria() {
  const [open, setOpen] = useState(false)

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
            우선순위 순서대로 분류됩니다 (1번이 가장 높은 우선순위)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {SEGMENTS.map((seg, i) => (
              <div
                key={seg}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: SEGMENT_COLORS[seg] }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{SEGMENT_LABELS[seg]}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{SEGMENT_DESCRIPTIONS[seg]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
