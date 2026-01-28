'use client'

import { formatNumber } from '@/lib/utils/formatters'

interface CrmKpiCardsProps {
  totalCustomers: number
  newCustomers: number
  atRiskCustomers: number
  churnedCustomers: number
  timeTicketCustomers: number
  termTicketCustomers: number
  fixedTicketCustomers: number
}

export function CrmKpiCards({
  totalCustomers,
  newCustomers,
  atRiskCustomers,
  churnedCustomers,
  timeTicketCustomers,
  termTicketCustomers,
  fixedTicketCustomers,
}: CrmKpiCardsProps) {
  const ticketIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )

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
      label: '신규 고객',
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
      label: '이탈위험',
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
      label: '이탈',
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
      label: '시간권',
      value: timeTicketCustomers,
      accentColor: '#06B6D4',
      barColor: 'bg-cyan-500',
      barBg: 'bg-cyan-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (timeTicketCustomers / totalCustomers) * 100) : 0,
      icon: ticketIcon,
    },
    {
      label: '기간권',
      value: termTicketCustomers,
      accentColor: '#8B5CF6',
      barColor: 'bg-purple-500',
      barBg: 'bg-purple-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (termTicketCustomers / totalCustomers) * 100) : 0,
      icon: ticketIcon,
    },
    {
      label: '고정석',
      value: fixedTicketCustomers,
      accentColor: '#10B981',
      barColor: 'bg-emerald-500',
      barBg: 'bg-emerald-100',
      barPercent: totalCustomers > 0 ? Math.min(100, (fixedTicketCustomers / totalCustomers) * 100) : 0,
      icon: ticketIcon,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
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
