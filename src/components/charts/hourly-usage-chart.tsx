'use client'

import { memo, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface HourlyUsageData {
  hour: number
  count: number
}

interface HourlyUsageChartProps {
  data: HourlyUsageData[]
  title: string
  height?: number
}

export const HourlyUsageChart = memo(function HourlyUsageChart({
  data,
  title,
  height = 350
}: HourlyUsageChartProps) {
  // 시간 포맷팅 (0 -> "00시", 13 -> "13시") - 메모이제이션
  const chartData = useMemo(() =>
    data.map(item => ({
      ...item,
      label: `${item.hour.toString().padStart(2, '0')}시`
    })), [data])

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={1}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toLocaleString('ko-KR')}
          />
          <Tooltip
            formatter={(value: number) => [
              `${value.toLocaleString('ko-KR')}명`,
              '이용자 수'
            ]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar
            dataKey="count"
            name="이용자 수"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            fillOpacity={0.8}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="추이"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#ef4444' }}
            legendType="line"
            tooltipType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})
