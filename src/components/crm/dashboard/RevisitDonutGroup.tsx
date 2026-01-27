'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface RevisitDonutGroupProps {
  generalRevisitRate: number
  newRevisitRate: number
}

function MiniDonut({ rate, label, color, bgColor }: { rate: number; label: string; color: string; bgColor: string }) {
  const data = [
    { name: '재방문', value: rate },
    { name: '미방문', value: 100 - rate },
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={50}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill={bgColor} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{rate.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

export function RevisitDonutGroup({ generalRevisitRate, newRevisitRate }: RevisitDonutGroupProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-gray-800">재방문 비율</h3>
        <span className="text-[11px] text-gray-400 font-medium">기간 내 2회+ 방문</span>
      </div>
      <div className="flex justify-around">
        <MiniDonut rate={generalRevisitRate} label="일반 고객" color="#6366F1" bgColor="#E0E7FF" />
        <MiniDonut rate={newRevisitRate} label="신규 고객" color="#22C55E" bgColor="#DCFCE7" />
      </div>
    </div>
  )
}
