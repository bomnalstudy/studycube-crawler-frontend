'use client'

import { useState, useEffect, useCallback } from 'react'
import { CustomerDetail, CustomerMemoItem, CustomerClaimItem } from '@/types/crm'
import { CustomerProfile } from '@/components/crm/detail/CustomerProfile'
import { CustomerStatsCard } from '@/components/crm/detail/CustomerStats'
import { PurchaseTimeline } from '@/components/crm/detail/PurchaseTimeline'
import { MemoSection } from '@/components/crm/detail/MemoSection'
import { ClaimSection } from '@/components/crm/detail/ClaimSection'
import { CustomerTimeline } from '@/components/crm/detail/CustomerTimeline'

interface CustomerDetailPanelProps {
  customerId: string
  onClose: () => void
}

type TabKey = 'detail' | 'timeline'

export function CustomerDetailPanel({ customerId, onClose }: CustomerDetailPanelProps) {
  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('detail')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/crm/customers/${customerId}`)
      const json = await res.json()

      if (!json.success) {
        setError(json.error || '데이터를 불러올 수 없습니다')
        return
      }
      setData(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleMemoCreated = (memo: CustomerMemoItem) => {
    if (!data) return
    setData({ ...data, memos: [memo, ...data.memos] })
  }

  const handleMemoDeleted = (memoId: string) => {
    if (!data) return
    setData({ ...data, memos: data.memos.filter(m => m.id !== memoId) })
  }

  const handleClaimCreated = (claim: CustomerClaimItem) => {
    if (!data) return
    setData({ ...data, claims: [claim, ...data.claims] })
  }

  const handleClaimUpdated = (updatedClaim: CustomerClaimItem) => {
    if (!data) return
    setData({
      ...data,
      claims: data.claims.map(c => c.id === updatedClaim.id ? updatedClaim : c),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-800">고객 상세</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setActiveTab('detail')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
            activeTab === 'detail'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          상세 정보
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-2.5 text-xs font-semibold text-center transition-colors ${
            activeTab === 'timeline'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          이용 타임라인
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-32 bg-gray-200 rounded-xl" />
              <div className="h-32 bg-gray-200 rounded-xl" />
              <div className="h-48 bg-gray-200 rounded-xl" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : data ? (
          activeTab === 'detail' ? (
            <>
              <CustomerProfile customer={data} />
              <CustomerStatsCard stats={data.stats} />
              <PurchaseTimeline purchases={data.purchases} visits={data.visits} />
              <MemoSection
                customerId={data.id}
                memos={data.memos}
                onMemoCreated={handleMemoCreated}
                onMemoDeleted={handleMemoDeleted}
              />
              <ClaimSection
                customerId={data.id}
                claims={data.claims}
                onClaimCreated={handleClaimCreated}
                onClaimUpdated={handleClaimUpdated}
              />
            </>
          ) : (
            <CustomerTimeline visits={data.visits} />
          )
        ) : null}
      </div>
    </div>
  )
}
