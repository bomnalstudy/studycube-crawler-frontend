'use client'

import { useMemo, useState } from 'react'
import { CustomerPurchaseItem, CustomerVisitItem } from '@/types/crm'
import { formatCurrency } from '@/lib/utils/formatters'
import { inferTicketType, TicketSubType } from '@/lib/crm/segment-calculator'

interface PurchaseTimelineProps {
  purchases: CustomerPurchaseItem[]
  visits: CustomerVisitItem[]
}

type ViewMode = 'purchases' | 'usages' | 'visits'
type UsageFilter = 'all' | TicketSubType

const USAGE_FILTER_LABELS: Record<UsageFilter, string> = {
  all: '전체',
  term: '기간권',
  time: '시간권',
  fixed: '고정석',
  day: '당일권',
}

const TICKET_TYPE_BADGE: Record<TicketSubType, { label: string; className: string }> = {
  term: { label: '기간권', className: 'text-purple-500' },
  time: { label: '시간권', className: 'text-blue-500' },
  fixed: { label: '고정석', className: 'text-emerald-500' },
  day: { label: '당일권', className: 'text-amber-500' },
}

export function PurchaseTimeline({ purchases, visits }: PurchaseTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('purchases')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')

  const actualPurchases = useMemo(() => purchases.filter(p => p.amount > 0), [purchases])
  const usages = useMemo(() => purchases.filter(p => p.amount === 0), [purchases])

  const usagesByType = useMemo(() => {
    return usages.map(p => ({ ...p, ticketType: inferTicketType(p.ticketName) }))
  }, [usages])

  const filteredUsages = useMemo(() => {
    if (usageFilter === 'all') return usagesByType
    return usagesByType.filter(u => u.ticketType === usageFilter)
  }, [usagesByType, usageFilter])

  // 타입별 개수 (필터 버튼에 표시)
  const usageTypeCounts = useMemo(() => {
    const counts: Record<TicketSubType, number> = { term: 0, time: 0, fixed: 0, day: 0 }
    usagesByType.forEach(u => counts[u.ticketType]++)
    return counts
  }, [usagesByType])

  const tabs: { key: ViewMode; label: string; count: number }[] = [
    { key: 'purchases', label: '구매', count: actualPurchases.length },
    { key: 'usages', label: '사용', count: usages.length },
    { key: 'visits', label: '방문', count: visits.length },
  ]

  // 실제 존재하는 이용권 타입만 필터에 표시
  const activeUsageFilters: UsageFilter[] = useMemo(() => {
    const types = (['term', 'time', 'fixed', 'day'] as TicketSubType[]).filter(t => usageTypeCounts[t] > 0)
    return types.length > 1 ? ['all', ...types] : []
  }, [usageTypeCounts])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">이력</h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                viewMode === tab.key
                  ? 'bg-white text-gray-800 shadow-sm font-medium'
                  : 'text-gray-500'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* 사용 탭 세분화 필터 */}
      {viewMode === 'usages' && activeUsageFilters.length > 0 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {activeUsageFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setUsageFilter(filter)}
              className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                usageFilter === filter
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {USAGE_FILTER_LABELS[filter]}
              {filter !== 'all' && ` (${usageTypeCounts[filter]})`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {viewMode === 'purchases' && (
          actualPurchases.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">구매 이력이 없습니다</p>
          ) : (
            actualPurchases.map(p => (
              <PurchaseRow key={p.id} item={p} />
            ))
          )
        )}

        {viewMode === 'usages' && (
          filteredUsages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">사용 이력이 없습니다</p>
          ) : (
            filteredUsages.map(u => {
              const badge = TICKET_TYPE_BADGE[u.ticketType]
              return (
                <div key={u.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.ticketName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {u.purchaseDate} · {u.branchName}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${badge.className}`}>{badge.label} 사용</span>
                </div>
              )
            })
          )
        )}

        {viewMode === 'visits' && (
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

function PurchaseRow({ item }: { item: CustomerPurchaseItem }) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
      <div>
        <p className="text-sm font-medium text-gray-800">{item.ticketName}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {item.purchaseDate} · {item.branchName}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-700">{formatCurrency(item.amount)}</p>
        {item.pointUsed && item.pointUsed > 0 && (
          <p className="text-xs text-orange-500">포인트 {formatCurrency(item.pointUsed)}</p>
        )}
      </div>
    </div>
  )
}
