'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SegmentChartItem, SEGMENT_COLORS, CustomerSegment } from '@/types/crm'
import { formatCurrency } from '@/lib/utils/formatters'

interface SegmentLtvChartProps {
  data: SegmentChartItem[]
}

export function SegmentLtvChart({ data }: SegmentLtvChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">세그먼트별 평균 LTV</h3>
        <p className="text-xs text-gray-400 text-center py-10">데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">세그먼트별 평균 LTV</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v / 10000)}만`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={50}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), '평균 LTV']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              fill="#3B82F6"
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
