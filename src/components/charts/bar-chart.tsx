'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { BarChartData } from '@/types/dashboard'

interface BarChartProps {
  data: BarChartData[]
  title: string
  dataKey?: string
  xAxisKey?: string
  color?: string
  height?: number
  showValues?: boolean
  formatValue?: (value: number) => string
}

export function BarChart({
  data,
  title,
  dataKey = 'value',
  xAxisKey = 'label',
  color = '#3b82f6',
  height = 300,
  showValues = true,
  formatValue
}: BarChartProps) {
  // 기본 값 포맷터 (천단위 콤마)
  const defaultFormatter = (value: number) => {
    return value.toLocaleString('ko-KR')
  }

  const valueFormatter = formatValue || defaultFormatter

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]}>
            {showValues && (
              <LabelList
                dataKey={dataKey}
                position="top"
                formatter={valueFormatter}
                style={{
                  fill: '#374151',
                  fontWeight: 600,
                  fontSize: '12px'
                }}
              />
            )}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
