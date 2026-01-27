'use client'

import { CustomerStats as CustomerStatsType } from '@/types/crm'
import { formatCurrency } from '@/lib/utils/formatters'

interface CustomerStatsProps {
  stats: CustomerStatsType
}

export function CustomerStatsCard({ stats }: CustomerStatsProps) {
  const items = [
    {
      label: '평균 이용시간',
      value: stats.avgDuration ? `${stats.avgDuration}분` : '-',
      icon: '⏱️',
    },
    {
      label: '주 이용시간대',
      value: stats.peakHour !== null ? `${stats.peakHour}시` : '-',
      icon: '🕐',
    },
    {
      label: '방문 주기',
      value: stats.visitCycleDays ? `${stats.visitCycleDays}일` : '-',
      icon: '📅',
    },
    {
      label: '월평균 소비',
      value: formatCurrency(stats.monthlyAvgSpent),
      icon: '💰',
    },
    {
      label: '구매 주기',
      value: stats.purchaseCycleDays ? `${stats.purchaseCycleDays}일` : '-',
      icon: '🛒',
    },
    {
      label: '선호 이용권',
      value: stats.favoriteTicket || '-',
      icon: '🎫',
    },
    {
      label: '선호 좌석',
      value: stats.favoriteSeat || '-',
      icon: '💺',
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">고객 통계</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="flex items-start gap-2">
            <span className="text-sm mt-0.5">{item.icon}</span>
            <div>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-sm font-medium text-gray-700">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
