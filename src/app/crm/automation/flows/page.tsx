'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRole } from '@/hooks/useRole'
import { AutomationFlow, FlowType } from '@/types/automation'
import { FlowList } from '@/components/automation/FlowList/FlowList'

export default function FlowListPage() {
  const { isAdmin, branchId: userBranchId } = useRole()
  const [flows, setFlows] = useState<AutomationFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FlowType | 'ALL'>('ALL')

  const fetchFlows = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType !== 'ALL') params.set('flowType', filterType)
      const res = await fetch(`/api/crm/automation/flows?${params}`)
      const json = await res.json()
      if (json.success) setFlows(json.data)
    } catch {
      // 무시
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchFlows()
  }, [fetchFlows])

  const handleToggleActive = async (flowId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/crm/automation/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (json.success) {
        setFlows(prev => prev.map(f => f.id === flowId ? { ...f, isActive } : f))
      }
    } catch {
      // 무시
    }
  }

  const handleDelete = async (flowId: string) => {
    try {
      const res = await fetch(`/api/crm/automation/flows/${flowId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setFlows(prev => prev.filter(f => f.id !== flowId))
      }
    } catch {
      // 무시
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">플로우 관리</h1>
            <p className="text-sm text-gray-500 mt-1">자동화 플로우를 생성하고 관리합니다.</p>
          </div>
          <Link
            href="/crm/automation/flows/new"
            className="px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            + 새 플로우
          </Link>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2">
          {(['ALL', 'SMS', 'POINT', 'SMS_POINT'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterType === type
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {type === 'ALL' ? '전체' : type === 'SMS' ? '문자' : type === 'POINT' ? '포인트' : '문자+포인트'}
            </button>
          ))}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-400 mt-3">불러오는 중...</p>
          </div>
        ) : (
          <FlowList
            flows={flows}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
