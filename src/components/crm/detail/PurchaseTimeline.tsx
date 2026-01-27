'use client'

import { useState } from 'react'
import { CustomerPurchaseItem, CustomerVisitItem } from '@/types/crm'
import { formatCurrency } from '@/lib/utils/formatters'

interface PurchaseTimelineProps {
  purchases: CustomerPurchaseItem[]
  visits: CustomerVisitItem[]
}

type ViewMode = 'purchases' | 'visits'

export function PurchaseTimeline({ purchases, visits }: PurchaseTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('purchases')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">이력</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('purchases')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              viewMode === 'purchases'
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500'
            }`}
          >
            구매 ({purchases.length})
          </button>
          <button
            onClick={() => setViewMode('visits')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              viewMode === 'visits'
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500'
            }`}
          >
            방문 ({visits.length})
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {viewMode === 'purchases' ? (
          purchases.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">구매 이력이 없습니다</p>
          ) : (
            purchases.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.ticketName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.purchaseDate} · {p.branchName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{formatCurrency(p.amount)}</p>
                  {p.pointUsed && p.pointUsed > 0 && (
                    <p className="text-xs text-orange-500">포인트 {formatCurrency(p.pointUsed)}</p>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          visits.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">방문 이력이 없습니다</p>
          ) : (
            visits.map(v => (
              <div key={v.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{v.visitDate}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.visitTime || '-'} · {v.branchName}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {v.duration ? `${v.duration}분` : '-'}
                  {v.seat && <span className="ml-2">좌석: {v.seat}</span>}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
