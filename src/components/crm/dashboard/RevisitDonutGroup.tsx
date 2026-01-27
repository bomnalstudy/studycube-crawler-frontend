'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface RevisitDonutGroupProps {
  generalRevisitRate: number
  newRevisitRate: number
}

function MiniDonut({ rate, label, color }: { rate: number; label: string; color: string }) {
  const data = [
    { name: '재방문', value: rate },
    { name: '미방문', value: 100 - rate },
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="w-28 h-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={45}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{rate.toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  )
}

export function RevisitDonutGroup({ generalRevisitRate, newRevisitRate }: RevisitDonutGroupProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">재방문 비율</h3>
      <div className="flex justify-around">
        <MiniDonut rate={generalRevisitRate} label="일반 고객" color="#3B82F6" />
        <MiniDonut rate={newRevisitRate} label="신규 고객" color="#22C55E" />
      </div>
    </div>
  )
}
