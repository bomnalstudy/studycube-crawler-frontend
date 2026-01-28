'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays } from 'date-fns'
import { useRole } from '@/hooks/useRole'
import { TimelineData } from '@/types/crm'
import { TimelineDatePicker } from '@/components/crm/timeline/TimelineDatePicker'
import { TimelineGanttChart } from '@/components/crm/timeline/TimelineGanttChart'
import { CustomerDetailPanel } from '@/components/crm/customers/CustomerDetailPanel'
import { BranchSelector } from '@/components/dashboard/branch-selector'

interface Branch {
  id: string
  name: string
}

export default function TimelinePage() {
  const { isAdmin, branchId: userBranchId } = useRole()

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [date, setDate] = useState<Date>(subDays(new Date(), 1))
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // 지점 목록
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches')
        const json = await res.json()
        if (json.success) {
          setBranches(json.data)
          if (!isAdmin && userBranchId) {
            setSelectedBranchId(userBranchId)
          }
        }
      } catch {
        // 무시
      }
    }
    fetchBranches()
  }, [isAdmin, userBranchId])

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const dateStr = format(date, 'yyyy-MM-dd')
      const params = new URLSearchParams({
        date: dateStr,
        branchId: selectedBranchId,
      })
      const res = await fetch(`/api/crm/timeline?${params}`)
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
  }, [date, selectedBranchId])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  const handleClosePanel = () => {
    setSelectedCustomerId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">타임라인</h1>
            <p className="text-sm text-gray-500 mt-1">시간대별 이용자 현황</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <BranchSelector
                branches={branches}
                selectedBranchId={selectedBranchId}
                onBranchChange={setSelectedBranchId}
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600">지점:</span>
                <span className="text-sm font-medium">
                  {branches.find(b => b.id === userBranchId)?.name || '내 지점'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 날짜 선택기 */}
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <TimelineDatePicker date={date} onDateChange={setDate} />
        </div>

        {/* 간트 차트 */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-400 mt-3">불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchTimeline}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : data ? (
          <TimelineGanttChart
            hours={data.hours}
            onCustomerClick={setSelectedCustomerId}
          />
        ) : null}
      </div>

      {/* 고객 상세 오버레이 패널 */}
      {selectedCustomerId && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClosePanel}
          />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <CustomerDetailPanel
              key={selectedCustomerId}
              customerId={selectedCustomerId}
              onClose={handleClosePanel}
            />
          </div>
        </>
      )}
    </div>
  )
}
