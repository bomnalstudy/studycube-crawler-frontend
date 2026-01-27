'use client'

import { formatNumber } from '@/lib/utils/formatters'

interface CrmKpiCardsProps {
  totalCustomers: number
  newCustomers: number
  atRiskCustomers: number
  churnedCustomers: number
  claimCustomers: number
}

export function CrmKpiCards({
  totalCustomers,
  newCustomers,
  atRiskCustomers,
  churnedCustomers,
  claimCustomers,
}: CrmKpiCardsProps) {
  const cards = [
    {
      label: '전체 고객',
      value: totalCustomers,
      accentColor: '#6366F1',
      barColor: 'bg-indigo-500',
      barBg: 'bg-indigo-100',
      barPercent: 100,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: '신규 고객 (7일 이내)',
      value: newCustomers,
      accentColor: '#22C55E',
      barColor: 'bg-green-500',
      barBg: 'bg-green-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (newCustomers / totalCustomers) * 100) : 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
    {
      label: '이탈위험 (7~30일 미방문)',
      value: atRiskCustomers,
      accentColor: '#F97316',
      barColor: 'bg-orange-500',
      barBg: 'bg-orange-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (atRiskCustomers / totalCustomers) * 100) : 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
    {
      label: '이탈 (30일+ 미방문)',
      value: churnedCustomers,
      accentColor: '#991B1B',
      barColor: 'bg-red-800',
      barBg: 'bg-red-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (churnedCustomers / totalCustomers) * 100) : 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
        </svg>
      ),
    },
    {
      label: '클레임 고객',
      value: claimCustomers,
      accentColor: '#EF4444',
      barColor: 'bg-red-500',
      barBg: 'bg-red-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (claimCustomers / totalCustomers) * 100) : 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: card.accentColor + '15', color: card.accentColor }}
            >
              {card.icon}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(card.value)}
          </p>
          <p className="text-xs text-gray-500 font-medium mb-3">{card.label}</p>
          <div className={`w-full h-1.5 ${card.barBg} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${card.barColor} rounded-full transition-all duration-500`}
              style={{ width: `${card.barPercent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
