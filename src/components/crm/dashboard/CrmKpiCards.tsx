'use client'

import { formatNumber } from '@/lib/utils/formatters'

interface CrmKpiCardsProps {
  totalCustomers: number
  newCustomers: number
  atRiskCustomers: number
  claimCustomers: number
}

export function CrmKpiCards({
  totalCustomers,
  newCustomers,
  atRiskCustomers,
  claimCustomers,
}: CrmKpiCardsProps) {
  const cards = [
    {
      label: '전체 고객',
      value: totalCustomers,
      color: 'text-gray-800',
      bgColor: 'bg-gray-50',
      iconBg: 'bg-gray-200',
      icon: '👥',
    },
    {
      label: '신규 고객 (3일 이내)',
      value: newCustomers,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-200',
      icon: '🆕',
    },
    {
      label: '이탈위험 (7일 미방문)',
      value: atRiskCustomers,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-200',
      icon: '⚠️',
    },
    {
      label: '클레임 고객',
      value: claimCustomers,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-200',
      icon: '🚨',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bgColor} rounded-xl p-4 border border-gray-100`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`${card.iconBg} w-8 h-8 rounded-lg flex items-center justify-center text-sm`}>
              {card.icon}
            </span>
            <span className="text-xs text-gray-500 font-medium">{card.label}</span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>
            {formatNumber(card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
