'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface TicketRevenueData {
  ticketName: string
  revenue: number
}

interface TicketRevenueChartProps {
  data: TicketRevenueData[]
  title: string
  height?: number
}

// 색상 배열 (그라데이션 효과)
const COLORS = [
  '#3b82f6', // blue-500
  '#60a5fa', // blue-400
  '#93c5fd', // blue-300
  '#6366f1', // indigo-500
  '#818cf8', // indigo-400
  '#a5b4fc', // indigo-300
  '#8b5cf6', // violet-500
  '#a78bfa', // violet-400
  '#c4b5fd', // violet-300
  '#d8b4fe', // violet-200
]

export function TicketRevenueChart({
  data,
  title,
  height = 400
}: TicketRevenueChartProps) {
  // 금액 포맷터
  const formatRevenue = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만원`
    }
    return `${value.toLocaleString('ko-KR')}원`
  }

  // 이름이 길 경우 축약
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length > maxLength) {
      return name.substring(0, maxLength) + '...'
    }
    return name
  }

  // 차트 데이터 가공
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: truncateName(item.ticketName),
    rank: index + 1
  }))

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-gray-500">
          데이터가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={formatRevenue}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              tick={{ fontSize: 12 }}
              width={90}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString('ko-KR')}원`,
                '매출'
              ]}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  const item = payload[0].payload
                  return `${item.rank}위: ${item.ticketName}`
                }
                return ''
              }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar
              dataKey="revenue"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
