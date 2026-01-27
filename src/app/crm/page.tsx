'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRole } from '@/hooks/useRole'
import { CrmDashboardData } from '@/types/crm'
import { CrmKpiCards } from '@/components/crm/dashboard/CrmKpiCards'
import { RevisitDonutGroup } from '@/components/crm/dashboard/RevisitDonutGroup'
import { OperationQueue } from '@/components/crm/dashboard/OperationQueue'
import { SegmentLtvChart } from '@/components/crm/dashboard/SegmentLtvChart'
import { SegmentRevisitChart } from '@/components/crm/dashboard/SegmentRevisitChart'
import { BranchSelector } from '@/components/dashboard/branch-selector'

interface Branch {
  id: string
  name: string
}

export default function CrmDashboardPage() {
  const { isAdmin, branchId: userBranchId } = useRole()
  const [data, setData] = useState<CrmDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  // 지점 목록 가져오기
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('branchId', selectedBranchId)

      const res = await fetch(`/api/crm/dashboard?${params}`)
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
  }, [selectedBranchId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 + 필터 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">CRM 대시보드</h1>
            <p className="text-sm text-gray-500 mt-1">고객 세그먼트 현황 및 운영 큐</p>
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

        {/* KPI 카드 */}
        <CrmKpiCards
          totalCustomers={data.kpi.totalCustomers}
          newCustomers={data.kpi.newCustomers}
          atRiskCustomers={data.kpi.atRiskCustomers}
          claimCustomers={data.kpi.claimCustomers}
        />

        {/* 재방문 비율 + 운영 큐 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevisitDonutGroup
            generalRevisitRate={data.revisitRatios.generalRevisitRate}
            newRevisitRate={data.revisitRatios.newRevisitRate}
          />
          <OperationQueue
            atRisk={data.operationQueue.atRisk}
            newSignups={data.operationQueue.newSignups}
            dayTicketRepeaters={data.operationQueue.dayTicketRepeaters}
          />
        </div>

        {/* 세그먼트 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SegmentLtvChart data={data.segmentLtv} />
          <SegmentRevisitChart data={data.segmentRevisitRate} />
        </div>
      </div>
    </div>
  )
}
