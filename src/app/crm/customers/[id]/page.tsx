'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CustomerDetail, CustomerMemoItem, CustomerClaimItem } from '@/types/crm'
import { CustomerProfile } from '@/components/crm/detail/CustomerProfile'
import { CustomerStatsCard } from '@/components/crm/detail/CustomerStats'
import { PurchaseTimeline } from '@/components/crm/detail/PurchaseTimeline'
import { MemoSection } from '@/components/crm/detail/MemoSection'
import { ClaimSection } from '@/components/crm/detail/ClaimSection'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [data, setData] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-32" />
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50 pt-16 px-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        {/* 프로필 + 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CustomerProfile customer={data} />
          <CustomerStatsCard stats={data.stats} />
        </div>

        {/* 구매/방문 이력 */}
        <PurchaseTimeline
          purchases={data.purchases}
          visits={data.visits}
        />

        {/* 메모 + 클레임 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        </div>
      </div>
    </div>
  )
}
