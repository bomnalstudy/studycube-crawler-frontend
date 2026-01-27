'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { SegmentChartItem, SEGMENT_COLORS, CustomerSegment } from '@/types/crm'

interface SegmentDistributionChartProps {
  data: SegmentChartItem[]
}

export function SegmentDistributionChart({ data }: SegmentDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  if (data.length === 0 || total === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">세그먼트별 고객 분포</h3>
        <div className="flex flex-col items-center py-10">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400">데이터가 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-800">세그먼트별 고객 분포</h3>
        <span className="text-[11px] text-gray-400 font-medium">총 {total.toLocaleString()}명</span>
      </div>
      <div className="flex items-center gap-4">
        {/* 도넛 차트 */}
        <div className="w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.segment}
                    fill={SEGMENT_COLORS[entry.segment as CustomerSegment] || '#6B7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => {
                  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                  return [`${value.toLocaleString()}명 (${pct}%)`, '고객 수']
                }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* 범례 */}
        <div className="flex-1 grid grid-cols-1 gap-1.5">
          {data.map((item) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
            return (
              <div key={item.segment} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SEGMENT_COLORS[item.segment as CustomerSegment] || '#6B7280' }}
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
}
