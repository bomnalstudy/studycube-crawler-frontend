'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OperationQueueItem } from '@/types/crm'
import { maskPhone } from '@/lib/crm/phone-masker'
import { formatCurrency } from '@/lib/utils/formatters'

interface OperationQueueProps {
  atRisk: OperationQueueItem[]
  returned: OperationQueueItem[]
  newSignups: OperationQueueItem[]
  dayTicketRepeaters: OperationQueueItem[]
}

type TabKey = 'atRisk' | 'returned' | 'newSignups' | 'dayTicketRepeaters'

const TABS: { key: TabKey; label: string; emptyText: string; color: string }[] = [
  { key: 'atRisk', label: '이탈위험', emptyText: '이탈위험 고객이 없습니다', color: '#F97316' },
  { key: 'returned', label: '복귀', emptyText: '복귀 고객이 없습니다', color: '#8B5CF6' },
  { key: 'newSignups', label: '신규가입', emptyText: '신규가입 고객이 없습니다', color: '#22C55E' },
  { key: 'dayTicketRepeaters', label: '당일권 반복', emptyText: '당일권 반복구매 고객이 없습니다', color: '#3B82F6' },
]

export function OperationQueue({ atRisk, returned, newSignups, dayTicketRepeaters }: OperationQueueProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('atRisk')

  const dataMap: Record<TabKey, OperationQueueItem[]> = {
    atRisk,
    returned,
    newSignups,
    dayTicketRepeaters,
  }

  const currentData = dataMap[activeTab]
  const currentTab = TABS.find(t => t.key === activeTab)!

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">운영 큐</h3>
        <span className="text-[11px] text-gray-400 font-medium">최근 30일 기준</span>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-50 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            <span className={`ml-1 ${activeTab === tab.key ? 'text-gray-500' : 'text-gray-300'}`}>
              {dataMap[tab.key].length}
            </span>
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {currentData.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">{currentTab.emptyText}</p>
          </div>
        ) : (
          currentData.map(item => (
            <Link
              key={item.customerId}
              href={`/crm/customers/${item.customerId}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: currentTab.color }}
                >
                  {maskPhone(item.phone).slice(-4)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                    {maskPhone(item.phone)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    마지막 방문: {item.lastVisitDate || '-'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600">
                  {item.totalVisits}회
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatCurrency(item.totalSpent)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
