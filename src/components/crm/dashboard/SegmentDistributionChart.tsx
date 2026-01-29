'use client'

import { memo, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  SegmentChartItem, VisitSegment, TicketSegment,
  VISIT_SEGMENT_COLORS, TICKET_SEGMENT_COLORS,
} from '@/types/crm'

interface SegmentDistributionChartProps {
  visitData: SegmentChartItem[]
  ticketData: SegmentChartItem[]
}

function getColor(segment: string): string {
  return VISIT_SEGMENT_COLORS[segment as VisitSegment]
    || TICKET_SEGMENT_COLORS[segment as TicketSegment]
    || '#6B7280'
}

const DonutChart = memo(function DonutChart({ data, title }: { data: SegmentChartItem[]; title: string }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data])

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex-1">
        <h4 className="text-xs font-medium text-gray-500 mb-3">{title}</h4>
        <div className="flex flex-col items-center py-6">
          <p className="text-xs text-gray-400">데이터가 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-gray-500">{title}</h4>
        <span className="text-[11px] text-gray-400">{total.toLocaleString()}명</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.segment} fill={getColor(entry.segment)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                  return [`${value.toLocaleString()}명 (${pct}%)`, '고객 수']
                }}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {data.map((item) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
            return (
              <div key={item.segment} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColor(item.segment) }}
                  />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-800">{item.value.toLocaleString()}명</span>
                  <span className="text-[11px] text-gray-400 w-12 text-right">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export const SegmentDistributionChart = memo(function SegmentDistributionChart({ visitData, ticketData }: SegmentDistributionChartProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-5">세그먼트별 고객 분포</h3>
      <div className="flex flex-col lg:flex-row gap-6">
        <DonutChart data={visitData} title="방문 세그먼트" />
        <div className="hidden lg:block w-px bg-gray-100" />
        <DonutChart data={ticketData} title="이용권 세그먼트" />
      </div>
    </div>
  )
})
