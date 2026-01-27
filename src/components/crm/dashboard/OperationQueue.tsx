'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OperationQueueItem } from '@/types/crm'
import { maskPhone } from '@/lib/crm/phone-masker'
import { formatCurrency } from '@/lib/utils/formatters'

interface OperationQueueProps {
  atRisk: OperationQueueItem[]
  newSignups: OperationQueueItem[]
  dayTicketRepeaters: OperationQueueItem[]
}

type TabKey = 'atRisk' | 'newSignups' | 'dayTicketRepeaters'

const TABS: { key: TabKey; label: string; emptyText: string }[] = [
  { key: 'atRisk', label: '이탈위험', emptyText: '이탈위험 고객이 없습니다' },
  { key: 'newSignups', label: '신규가입', emptyText: '신규가입 고객이 없습니다' },
  { key: 'dayTicketRepeaters', label: '당일권 반복', emptyText: '당일권 반복구매 고객이 없습니다' },
]

export function OperationQueue({ atRisk, newSignups, dayTicketRepeaters }: OperationQueueProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('atRisk')

  const dataMap: Record<TabKey, OperationQueueItem[]> = {
    atRisk,
    newSignups,
    dayTicketRepeaters,
  }

  const currentData = dataMap[activeTab]
  const currentTab = TABS.find(t => t.key === activeTab)!

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">운영 큐</h3>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-gray-400">
              ({dataMap[tab.key].length})
            </span>
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {currentData.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">{currentTab.emptyText}</p>
        ) : (
          currentData.map(item => (
            <Link
              key={item.customerId}
              href={`/crm/customers/${item.customerId}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {maskPhone(item.phone)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  마지막 방문: {item.lastVisitDate || '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  방문 {item.totalVisits}회
                </p>
                <p className="text-xs text-gray-400">
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
