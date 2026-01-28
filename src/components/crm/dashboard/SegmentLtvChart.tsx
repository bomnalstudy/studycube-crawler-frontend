'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  SegmentChartItem, VisitSegment, TicketSegment,
  VISIT_SEGMENT_COLORS, TICKET_SEGMENT_COLORS,
} from '@/types/crm'
import { formatCurrency } from '@/lib/utils/formatters'

interface SegmentLtvChartProps {
  visitData: SegmentChartItem[]
  ticketData: SegmentChartItem[]
}

function getColor(segment: string): string {
  return VISIT_SEGMENT_COLORS[segment as VisitSegment]
    || TICKET_SEGMENT_COLORS[segment as TicketSegment]
    || '#6366F1'
}

function LtvBarChart({ data, title }: { data: SegmentChartItem[]; title: string }) {
  if (data.length === 0) {
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
      <h4 className="text-xs font-medium text-gray-500 mb-3">{title}</h4>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              tickFormatter={(v) => `${Math.round(v / 10000)}만`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={50}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), '평균 LTV']}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((entry) => (
                <Cell key={entry.segment} fill={getColor(entry.segment)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function SegmentLtvChart({ visitData, ticketData }: SegmentLtvChartProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-800">세그먼트별 평균 LTV</h3>
        <span className="text-[11px] text-gray-400 font-medium">고객 생애 가치</span>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <LtvBarChart data={visitData} title="방문 세그먼트" />
        <div className="hidden lg:block w-px bg-gray-100" />
        <LtvBarChart data={ticketData} title="이용권 세그먼트" />
      </div>
    </div>
  )
}
